import util from 'util';
import { TableDefinition } from './Table';

export abstract class Entity {
    static _table: TableDefinition;

    static _keyMapping: {
        [key: string]: {
            [variable: string]: {
                priority: number;
                prefix: string | undefined;
            };
        };
    };

    static _keyArray: { [key: string]: Array<string> };
    static _attributes: Set<string> = new Set();

    static find() {}

    static findOne() {}

    static create() {}

    get _() {
        return <typeof Entity>this.constructor;
    }

    save() {}

    remove() {}

    get attributes() {
        const attrs: { [key: string]: any } = {};
        // @ts-ignore
        this._._attributes.forEach((attr: string) => (attrs[attr] = this[attr]));

        return attrs;
    }

    toString() {
        return `${this._.name} ${JSON.stringify(this.attributes, undefined, 2)}`;
    }

    [util.inspect.custom](depth: any, opts: any) {
        return this.toString();
    }
}
