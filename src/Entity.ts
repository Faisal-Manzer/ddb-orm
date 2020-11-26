import util from 'util';
import { TableDefinition } from './Table';

export class Entity {
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
    static _attributes: Set<string>;

    constructor(attributes: Record<string, any> = {}) {
        Object.assign(this, attributes);
    }

    get __() {
        return <typeof Entity>this.constructor;
    }

    static create(attributes: Record<string, any>) {
        const entity = new this();
        Object.assign(entity, attributes);
        return entity;
    }

    static current(instance: Entity) {
        const attrs: Record<string, any> = {};
        this._attributes.forEach((attr: string) => {
            // @ts-ignore
            attrs[attr] = instance[attr];
        });

        return attrs;
    }

    async save() {
        await this.__._table.dynamodb
            .put({
                TableName: this.__._table.name,
                Item: this.__.current(this),
            })
            .promise();
    }

    toString() {
        return `${this.__.name} ${JSON.stringify(this.__.current(this), undefined, 2)}`;
    }

    [util.inspect.custom](depth: any, opts: any) {
        return this.toString();
    }
}
