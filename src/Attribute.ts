export function Attribute(target: any, key: string | symbol) {
    target.constructor._attributes.add(key);
}
