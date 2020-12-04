# Dynamodb Single Table ORM
This is an abstraction for using [single table design] with [dynamodb].
> Inspired by mythical [Rick Houlihan](https://twitter.com/houlihan_rick)

# THIS IS NOT READY YET: [DON'T USE THIS]()
This is an alpha software and is currently in active development. Documentations and API are to be done.

## Getting Started
```shell script
yarn add ddb-orm
# or
npm --save install ddb-orm
```

#### Declare keys used in table
```typescript
import { Key } from 'ddb-orm';

const PK = Key({ name: 'PK', sortKey: 'SK', isPrimaryIndex: true });
const SK = Key({ key: 'SK', sortKey: 'PK', index: 'InvertedIndex', });
```

#### Declare table properties
```typescript
import { TableFactory } from 'ddb-orm'

const Table = TableFactory({
    name: 'SocialTable',
    keys: [PK, SK],
    useLocal: true,  // using locally running dynamodb
});
```

#### Create the table (optional)
```typescript
await Table.create();
```

#### Define your entities
```typescript
import { Entity, Attribute } from 'ddb-orm'

@Table  // attach our table instance to entity
class User extends Entity {
    @PK('USER')
    @SK('#METADATA')
    username: string;

    @Attribute
    name: string;
}
```

### Save new user
```typescript
const user = new User({ username: 'test_user', name: 'Test User' });
await user.save();
```

### Find Multiple users
```typescript
const users = await User.find({ where: { username: 'test_user' } });
console.log(users);

/*
    [
        User { 
                "username": "test_user",
                "name": "Test User",
                "PK": "USER#test_user",
                "SK": "#METADATA#test_user"
        }
    ]
*/
```

### Find Particular user
```typescript
const user = await User.find({ username: 'test_user' });
console.log(user);

/*
    User { 
        "username": "test_user",
        "name": "Test User",
        "PK": "USER#test_user",
        "SK": "#METADATA#test_user"
    }
*/
```

## API Guide

### Key
| Option         | Description                                                                                                                      | Type                                        | Required | Default       |
|----------------|----------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------|----------|---------------|
| name           | Key name for table.                                                                                                              | `string`                                    | YES      |               |
| sortKey        | Sort key for the particular index.                                                                                               | `string`                                    | NO       |               |
| index          | Index key (and sort-key) if there is any. This will create a Global Secondary index for quering. Not required for primary index. | `string`                                    | NO       |               |
| isPrimaryIndex | Specify primary index for the table.                                                                                             | `Boolean`                                   | NO       | `false`       |
| projection     | Projection type of index.                                                                                                        | `string`(`ALL` \| `KEYS_ONLY` \| `INCLUDE`) | NO       | `ALL`         |
| attributes     | Only required for projection type `INCLUDE`.                                                                                     | `Array<string>`                             | NO       | `[]`          |
| rcu            | Read capacity units for Index.                                                                                                   | `number`                                    | NO       | `3`           |
| wcu            | Write capacity of the Index.                                                                                                     | `number`                                    | NO       | `3`           |


### TableFactory
| Option   | Description                                                                                                                  | Type       | Required | Default      |
|----------|------------------------------------------------------------------------------------------------------------------------------|------------|----------|--------------|
| name     | Name of the table used.                                                                                                      | string     | YES      |              |
| keys     | Arrays of Key. (at-least primary key is required)                                                                            | Array<Key> | YES      |              |
| region   | AWS region to be used for table.                                                                                             | string     | NO       | `ap-south-1` |
| endpoint | AWS dyanamodb endpoint. (`http://localhost:8000` for local and for production `https://dyanmodb.<aws-region>.amazonaws.com`) | string     | NO       |              |
| useLocal | Use local dyanmodb instead of cloud. (You need to run dyanamodb locally first)                                               | boolean    | NO       |              |


### Attribute
Marks any property as attribute.

### Entity
> TODO

## Example
> TODO

---
[dynamodb]: https://aws.amazon.com/dynamodb/
[single table design]: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-relational-modeling.html
[Rick Houlihan]: https://twitter.com/houlihan_rick
