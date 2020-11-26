import AWS from 'aws-sdk';

import { KeyDecoratorFactory } from './Attribute';
import { Entity } from './Entity';

interface TableConstructor {
    name: string;
    keys: Array<KeyDecoratorFactory>;
    region?: string;
    endpoint?: string;
    useLocal?: boolean;
    streamEnabled?: boolean;
}

export interface TableDefinition extends TableConstructor {
    ddb: AWS.DynamoDB;
    dynamodb: AWS.DynamoDB.DocumentClient;
}

interface TableFactory {
    (target: any): void;

    create: () => void;
    delete: () => void;
}

export const DEFAULT_REGION = 'ap-south-1';
export const DEFAULT_LOCAL_ENDPOINT = 'http://localhost:8000';

/**
 * Generates key schema for creating table.
 */
function getKeySchema(key: KeyDecoratorFactory | undefined): AWS.DynamoDB.KeySchema {
    if (!key) throw new Error('Key is undefined');
    const { key: keyName, sortKey: sortKey } = key.base;
    const schema = [{ AttributeName: keyName, KeyType: 'HASH' }];
    if (sortKey) schema.push({ AttributeName: sortKey, KeyType: 'RANGE' });

    return schema;
}

/**
 * Create table utility.
 */
async function CreateTable({ keys, name, ddb, streamEnabled }: TableDefinition) {
    const primaryKey = keys.find(({ base: { isPrimaryIndex } }) => isPrimaryIndex);
    if (!primaryKey) throw new Error('Primary key is required for a table');

    const params: AWS.DynamoDB.Types.CreateTableInput = {
        TableName: name,
        AttributeDefinitions: keys.map(({ base }) => ({
            AttributeName: base.key,
            AttributeType: 'S',
        })),
        KeySchema: getKeySchema(primaryKey),
        ProvisionedThroughput: {
            ReadCapacityUnits: primaryKey.base.rcu as number,
            WriteCapacityUnits: primaryKey.base.wrc as number,
        },
        GlobalSecondaryIndexes: keys
            .filter(({ base }) => base.index)
            .map((key) => ({
                IndexName: key.base.index as string,
                KeySchema: getKeySchema(key),
                Projection: {
                    ProjectionType: key.base.projection,
                    ...(key.base.attributes ? { NonKeyAttributes: key.base.attributes } : {}),
                },
                ProvisionedThroughput: {
                    ReadCapacityUnits: key.base.rcu as number,
                    WriteCapacityUnits: key.base.wrc as number,
                },
            })),
        StreamSpecification: {
            StreamEnabled: Boolean(streamEnabled),
        },
    };

    try {
        await ddb.createTable(params).promise();
        console.log(`Created Table: ${name}`);
    } catch (e) {
        console.log(`Error creating table: ${name}`);
        console.log(e);
    }
}

/**
 * Utility for deleting table.
 */
async function DeleteTable({ ddb, name }: TableDefinition) {
    try {
        await ddb.deleteTable({ TableName: name }).promise();
        console.log(`Deleted table: ${name}`);
    } catch (e) {
        console.log('Error in deleting table', e);
    }
}

export function TableFactory(table: TableConstructor): TableFactory {
    // Setting default values
    const region = table.region || DEFAULT_REGION;
    const endpoint =
        table.endpoint || (table.useLocal ? DEFAULT_LOCAL_ENDPOINT : `https://dynamodb.${region}.amazonaws.com`);

    const ddb = new AWS.DynamoDB({ endpoint, region });
    const dynamodb = new AWS.DynamoDB.DocumentClient({ endpoint, region });

    const base: TableDefinition = { ddb, dynamodb, region, endpoint, streamEnabled: false, ...table };

    function factory(target: typeof Entity) {
        target._table = base; // set static property table to given class
        return target;
    }

    factory.create = CreateTable.bind(undefined, base);
    factory.delete = DeleteTable.bind(undefined, base);

    return factory;
}
