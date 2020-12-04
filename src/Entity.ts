import util from 'util';
import { TableDefinition } from './Table';
import { KeyDecoratorFactory } from './Attribute';

interface KeyMapping {
    [key: string]: {
        [variable: string]: {
            priority: number;
            prefix: string | undefined;
        };
    };
}

interface KeyArray {
    [key: string]: Array<string>;
}

type Attributes = Record<string, any>;

interface Find {
    where: Attributes;
    limit?: number;
    count?: boolean;
}

export abstract class Entity {
    static _table: TableDefinition;
    static _keyMapping: KeyMapping;
    static _keyArray: KeyArray;
    static _attributes: Set<string>;

    constructor(attributes: Attributes = {}) {
        Object.assign(this, attributes);
    }

    get __() {
        return <typeof Entity>this.constructor;
    }

    static create(attributes: Attributes) {
        // @ts-ignore
        const entity = new this();
        Object.assign(entity, attributes);
        return entity;
    }

    static current(instance: Entity) {
        const attrs: Record<string, any> = {};
        // @ts-ignore
        this._attributes.forEach((attr: string) => (attrs[attr] = instance[attr]));

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

    static getPreferredKey(keys: Attributes) {
        const getKeyPair = (key: KeyDecoratorFactory) => {
            if (keys[key.base.key]) {
                if (key.base.sortKey) {
                    if (key.base.sortKey in this._keyArray) {
                        if (keys[key.base.sortKey]) return [key.base.key, key.base.sortKey];
                    } else if (!keys[key.base.sortKey]) return [key.base.key, key.base.sortKey];
                } else return [key.base.key];
            }

            return null;
        };

        const primaryKey = this._table.keys.find(({ base: { isPrimaryIndex } }) => isPrimaryIndex);
        if (!primaryKey) throw new Error('Primary key is required');

        const keyPair = getKeyPair(primaryKey);
        if (keyPair) {
            return { keys: keyPair };
        }

        const indexedKeys = this._table.keys
            .filter(({ base: { index } }) => !!index)
            .sort((a, b) => {
                if (a.base.rcu > b.base.rcu) return -1;
                if (a.base.rcu < b.base.rcu) return 1;
                return 0;
            });

        const keyWithALLSelection = indexedKeys.filter(({ base: { projection } }) => projection === 'ALL');

        for (const key of keyWithALLSelection) {
            const keyPair = getKeyPair(key);
            if (keyPair) {
                return { keys: keyPair, index: key.base.index };
            }
        }

        const keyWithIndex = indexedKeys.filter(({ base: { projection } }) => projection !== 'ALL');
        for (const key of keyWithIndex) {
            const keyPair = getKeyPair(key);
            if (keyPair) {
                return { keys: keyPair, reselection: true, index: key.base.index };
            }
        }

        return {};
    }

    /**
     * we have to find proper index on which we can query
     * Priority: 1. PrimaryIndex 2. Index with ALL projected attribute 3. Any complete index
     * If any index is not found raise error
     * Also for indexes with projected value other than ALL query again.
     */
    static async find({ where, count, limit }: Find): Promise<Entity[] | number> {
        const entity = this.create(where);
        const keyVariable = this.current(entity);

        // @todo Implement reselection
        const { keys = undefined, index = undefined, reselection = false } = this.getPreferredKey(keyVariable);

        // This will change in later versions
        // We will do scan instead of error
        if (!keys) throw new Error('No key got for query.');
        const query = {
            TableName: this._table.name,
            IndexName: index,
            KeyConditionExpression: keys.map((key) => `${key} = :x${key.toLowerCase()}`).join(' AND '),
            ExpressionAttributeValues: keys.reduce(
                (o, key) =>
                    Object.assign(o, {
                        [`:x${key.toLowerCase()}`]: keyVariable[key],
                    }),
                {},
            ),
            ...(limit ? { Limit: limit } : {}),
            ...(count ? { Select: 'COUNT' } : {}),
        };

        console.time('Query');

        const { Items = [], Count } = await this._table.dynamodb.query(query).promise();
        if (count) return Count || 0;
        console.timeEnd('Query');

        return Items.map((item) => this.create(item));
    }

    static async findOne(attributes: Attributes) {
        const instances = (await this.find({ where: attributes, limit: 2 })) as Entity[];
        if (instances.length === 1) return instances[0];
        if (instances.length === 0) return null;
        throw new Error('Multiple objects found');
    }

    toString() {
        return `${this.__.name} ${JSON.stringify(this.__.current(this), undefined, 2)}`;
    }

    [util.inspect.custom](depth: any, opts: any) {
        return this.toString();
    }
}
