import { Entity } from './Entity';
import { getPrefix, computeKey } from './EntityUtils';

export interface KeyConstructor {
    key: string;
    sortKey: string;
    index: string;
    isPrimaryIndex: boolean;

    projection: 'ALL' | 'KEYS_ONLY' | 'INCLUDE';
    attributes: Array<string>;

    rcu: number;
    wrc: number;
}

export type PropertyDecorator = (target: any, key: string | symbol) => void;

export interface KeyDecoratorFactory {
    (prefix?: string, priority?: number): PropertyDecorator;

    base: KeyConstructor;
}

/**
 * Marks a property as attributes.
 * These attributes will be then inserted to dynamodb.
 */
export function Attribute(): PropertyDecorator {
    function Decorator(target: any, key: string | symbol) {
        const cons: typeof Entity = target.constructor;
        if (!cons._attributes) cons._attributes = new Set<string>();
        cons._attributes.add(key.toString());
    }

    return Decorator;
}

export function Key(key: Partial<KeyConstructor>): KeyDecoratorFactory {
    // @ts-ignore
    const base: KeyConstructor = {
        isPrimaryIndex: false,
        rcu: 3,
        wrc: 3,
        projection: 'ALL',
        ...key,
    };

    function Decorator(prefix?: string, priority = 1): PropertyDecorator {
        const key = base.key;

        return function (target: any, variableName: string | symbol): void {
            Attribute()(target, key); // making the key as an attribute
            Attribute()(target, variableName); // making the variable as an attribute

            const variable = variableName.toString(); // if symbol then use it's string values

            const cons: typeof Entity = typeof target === 'object' ? target.constructor : target; // just for sort name and type safety

            // Adding variable to keyMapping
            if (!cons._keyMapping) cons._keyMapping = {}; // checking if _keyMapping is initialized
            if (!cons._keyMapping[key]) cons._keyMapping[key] = {}; // checking if key object is initialized
            if (cons._keyMapping[key][variable]) throw new Error('Variable already assigned'); // If somehow variable already exists
            cons._keyMapping[key][variable] = { prefix, priority }; // setting value

            // Adding variable to keyArray
            if (!cons._keyArray) cons._keyArray = {}; // checking if _keyArray is initialized
            if (!cons._keyArray[key]) cons._keyArray[key] = []; // checking if key object is initialized
            cons._keyArray[key].push(variable); // adding variable to value

            // checking if key has multiple prefixes
            // this behaviour can be changed in further releases when multiple prefix support will come
            let keyHasPrefix = false;
            Object.keys(cons._keyMapping[key]).map((variable) => {
                if (cons._keyMapping[key][variable].prefix) {
                    if (!keyHasPrefix) keyHasPrefix = true;
                    else throw new Error('A key cant have more than one prefix');
                }
            });

            // sorting _keyArray for predictable results
            cons._keyArray[key].sort((a: string, b: string) => {
                if (cons._keyMapping[key][a].prefix) return -1;
                if (cons._keyMapping[key][b].prefix) return 1;
                if (cons._keyMapping[key][a].priority > cons._keyMapping[key][b].priority) return -1;
                if (cons._keyMapping[key][b].priority > cons._keyMapping[key][a].priority) return 1;

                return 0;
            });

            let variableValue = target[variable];
            let keyValue: string;

            const computeValueFromKey = () => {
                const prefix = getPrefix(target, key);
                if (keyValue) {
                    const valueArray = keyValue.replace(`${prefix}#`, '').split('#');
                    const index = cons._keyArray[key].indexOf(variable);
                    variableValue = valueArray[index];
                    if (variableValue !== target[variable]) {
                        target[variable] = variableValue;
                    }
                    return valueArray[index];
                }

                return undefined;
            };

            Object.defineProperties(target, {
                [variable]: {
                    get(): any {
                        if (variableValue) return variableValue;
                        if (target[key]) return computeValueFromKey();
                        return undefined;
                    },
                    set(v: any) {
                        variableValue = v;
                        computeKey(target, variable);
                    },
                    configurable: true,
                    enumerable: true,
                },
                [key]: {
                    get(): string {
                        return keyValue;
                    },
                    set(value: string) {
                        keyValue = value;
                        if (!variableValue) computeValueFromKey();
                    },
                    configurable: true,
                    enumerable: true,
                },
            });
        };
    }

    Decorator.base = base;

    return Decorator;
}
