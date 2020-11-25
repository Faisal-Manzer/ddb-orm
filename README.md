# Dynamodb Single Table ORM
This is an abstraction for using [single table design] with [dynamodb].
> Inspired by mythical person [Rick Houlihan](https://twitter.com/houlihan_rick)

## Getting Started
We will follow [AWS Hands-on guide](https://aws.amazon.com/getting-started/hands-on/design-a-database-for-a-mobile-app-with-dynamodb/4/).

| Entity     | HASH (PK)                  | RANGE (SK)                   |   |   |
|------------|----------------------------|------------------------------|---|---|
| User       | USER#<USERNAME>            | #METADATA#<USERNAME>         |   |   |
| Photo      | USER#<USERNAME>            | PHOTO#<USERNAME>#<TIMESTAMP> |   |   |
| Reaction   | REACTION#<USERNAME>#<TYPE> | PHOTO#<USERNAME>#<TIMESTAMP> |   |   |
| Friendship | USER#<USERNAME>            | #FRIEND#<FRIEND_USERNAME>    |   |   |


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
    keys: [PK, SK, GSK, GPK],
    useLocal: true,  // using locally running dynamodb
});
```

#### Create the table (optional)
```typescript
await Table.create();
```

#### Define our entities
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

## API Guide

# Key
> TODO

# TableFactory
> TODO

# Attribute
> TODO

# Entity
> TODO

### Example
> TODO

---
[dynamodb]: https://aws.amazon.com/dynamodb/
[single table design]: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-relational-modeling.html
[Rick Houlihan]: https://twitter.com/houlihan_rick
