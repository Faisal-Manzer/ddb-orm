import { Entity } from './Entity';

/**
 * function to get prefix of key
 */
export function getPrefix(target: any, key: string) {
    const cons: typeof Entity = target.constructor;

    if (cons._keyArray[key].length === 0) throw new Error('Key should have at-least one attribute');
    const variable = cons._keyArray[key][0];
    const { prefix } = cons._keyMapping[key][variable];
    if (!prefix) throw new Error('Key should have at-least one prefix');

    return prefix;
}

/**
 * compute key value
 */
export function computeKeyValue(target: any, keyName: string) {
    const cons: typeof Entity = target.constructor;

    const variables = cons._keyArray[keyName];
    const valueArray = [getPrefix(cons, keyName), ...variables.map((variable) => target[variable])];

    // if any variable does not have value then discard
    if (valueArray.indexOf(undefined) < 0) target[keyName] = valueArray.join('#');
    else target[keyName] = undefined;
}

/**
 * change all the key value which contains this variable
 */
export function computeKey(target: any, variable: string | undefined = undefined) {
    const cons: typeof Entity = target.constructor;

    let keys = Object.keys(cons._keyArray);
    if (variable) keys = keys.filter((key) => cons._keyArray[key].includes(variable));

    keys.map((key) => computeKeyValue(target, key));
}
