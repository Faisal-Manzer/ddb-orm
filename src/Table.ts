import AWS from 'aws-sdk';

import { KeyDecoratorFactory } from './Key';

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
}

export const DEFAULT_REGION = 'ap-south-1';
export const DEFAULT_LOCAL_ENDPOINT = 'http://localhost:8000';

export function TableFactory(table: TableConstructor): TableFactory {
    const region = table.region || DEFAULT_REGION;
    const endpoint =
        table.endpoint || (table.useLocal ? DEFAULT_LOCAL_ENDPOINT : `https://dynamodb.${region}.amazonaws.com`);

    const ddb = new AWS.DynamoDB({ endpoint, region });
    const dynamodb = new AWS.DynamoDB.DocumentClient({ endpoint, region });

    const base: TableDefinition = { ddb, dynamodb, region, endpoint, streamEnabled: false, ...table };

    function factory(target: any) {
        target._table = base;
        return target;
    }

    factory.create = async function () {
        console.log('--- Table Create ---');
        const getKeySchema = (primary: KeyDecoratorFactory | undefined): AWS.DynamoDB.KeySchema => {
            if (!primary) throw new Error('Key is undefined');
            let sortKey;
            if (primary.base.sortKey) sortKey = table.keys.find(({ base: sort }) => sort.key === primary.base.sortKey);

            return [
                { AttributeName: primary.base.key, KeyType: 'HASH' },
                ...(sortKey ? [{ AttributeName: sortKey.base.key, KeyType: 'RANGE' }] : []),
            ];
        };

        const primaryKey = table.keys.find(({ base }) => base.isPrimaryIndex);
        if (!primaryKey) throw new Error('Primary key is required for a table');

        const params: AWS.DynamoDB.Types.CreateTableInput = {
            TableName: base.name,
            AttributeDefinitions: table.keys.map(({ base }) => ({
                AttributeName: base.key,
                AttributeType: 'S',
            })),
            KeySchema: getKeySchema(primaryKey),
            ProvisionedThroughput: {
                ReadCapacityUnits: primaryKey.base.rcu as number,
                WriteCapacityUnits: primaryKey.base.wrc as number,
            },
            GlobalSecondaryIndexes: table.keys
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
                StreamEnabled: Boolean(base.streamEnabled),
            },
        };

        try {
            const Output = await ddb.createTable(params).promise();
            console.log(`Created Table: ${base.name}`);
            console.log(Output);
        } catch (e) {
            console.log(`Error creating table: ${base.name}`);
            console.log(e);
        }
    };

    return factory;
}
