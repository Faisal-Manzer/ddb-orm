import 'reflect-metadata';
import { Attribute } from './Attribute';

export interface KeyConstructor {
    key: string;
    sortKey?: string;
    index?: string;
    isPrimaryIndex?: boolean;

    projection?: 'ALL' | 'KEYS_ONLY' | 'INCLUDE';
    attributes?: Array<string>;

    rcu?: number;
    wrc?: number;
}

export type KeyDecorator = (target: any, key: string | symbol) => void;

export interface KeyDecoratorFactory {
    (prefix?: string, priority?: number): KeyDecorator;

    base: KeyConstructor;
}

export function Key(key: KeyConstructor): KeyDecoratorFactory {
    const base: KeyConstructor = {
        isPrimaryIndex: false,
        rcu: 3,
        wrc: 3,
        projection: 'ALL',
        ...key,
    };

    function decorator(prefix?: string, priority = 1): KeyDecorator {
        const key = base.key;

        return function (target: any, variableKey: string | symbol): void {
            Attribute(target, key);
            Attribute(target, variableKey);

            const variable = variableKey.toString();
            const constructor = target.constructor;

            if (!constructor._keyMapping) constructor._keyMapping = {};
            if (!constructor._keyMapping[key]) constructor._keyMapping[key] = {};
            if (constructor._keyMapping[key][variable]) throw new Error('Variable already assigned');
            constructor._keyMapping[key][variable] = { prefix, priority };

            let keyHasPrefix = false;
            Object.keys(constructor._keyMapping[key]).map((variable) => {
                if (constructor._keyMapping[key][variable].prefix) {
                    if (!keyHasPrefix) keyHasPrefix = true;
                    else throw new Error('A key cant have more than one prefix');
                }
            });

            if (!constructor._keyArray) constructor._keyArray = {};
            if (!constructor._keyArray[key]) constructor._keyArray[key] = [];
            constructor._keyArray[key].push(variable);

            constructor._keyArray[key].sort((a: string, b: string) => {
                if (constructor._keyMapping[key][a].prefix) return -1;
                if (constructor._keyMapping[key][b].prefix) return 1;
                if (constructor._keyMapping[key][a].priority > constructor._keyMapping[key][b].priority) return -1;
                if (constructor._keyMapping[key][b].priority > constructor._keyMapping[key][a].priority) return 1;

                return 0;
            });

            let keyValue: string;
            Object.defineProperty(target, key, {
                get(): string {
                    return keyValue;
                },
                set(value: string) {
                    keyValue = value;
                },
                configurable: true,
                enumerable: true,
            });

            const getPrefix = (keyName: string) => {
                const variable = constructor._keyArray[keyName][0];
                return constructor._keyMapping[keyName][variable].prefix;
            };

            const computeKeyValue = (keyName: string) => {
                let toSetValue = true;

                const variableArray = constructor._keyArray[keyName];
                const valueArray = [
                    getPrefix(keyName),
                    ...variableArray.map((variable: string) => {
                        if (target[variable]) return target[variable];
                        toSetValue = false;
                    }),
                ];

                if (toSetValue) target[keyName] = valueArray.join('#');
                else target[keyName] = undefined;
            };

            const computeKey = () => {
                Object.keys(constructor._keyArray)
                    .filter((key) => constructor._keyArray[key].includes(variable))
                    .map((key) => computeKeyValue(key));
            };

            const getValueFromKey = () => {
                // @todo
            };

            let variableValue = target[variable];
            Object.defineProperty(target, variable, {
                get(): any {
                    if (variableValue) return variableValue;
                    if (target[key]) return getValueFromKey();
                    return undefined;
                },
                set(v: any) {
                    variableValue = v;
                    computeKey();
                },
                configurable: true,
                enumerable: true,
            });
        };
    }

    decorator.base = base;

    return decorator;
}
