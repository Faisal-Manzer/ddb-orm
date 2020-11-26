import { Attribute, Key, TableFactory, Entity } from './index';
import { randomName, UUID, snakeCase, toTitleCase } from './utils';

const PK = Key({ key: 'PK', sortKey: 'SK', isPrimaryIndex: true });
const SK = Key({ key: 'SK', sortKey: 'PK', index: 'InvertedIndex' });
const GPK = Key({ key: 'GPK', sortKey: 'GSK', index: 'GSIOne' });
const GSK = Key({ key: 'GSK' });

const Table = TableFactory({
    name: 'TestTable',
    keys: [PK, SK, GSK, GPK],
    useLocal: true,
});

@Table
class User extends Entity {
    PK: string;

    @SK('#METADATA#USER')
    @PK('USER')
    userId: string;

    @GPK('USERNAME')
    _username: string;

    _name: string;

    get username() {
        return this._username;
    }

    set username(value) {
        this._username = snakeCase(value);
    }

    @Attribute()
    get name() {
        return this._name;
    }

    set name(value) {
        this._name = toTitleCase(value);
    }

    constructor({ name }: { name?: string } = {}) {
        super();

        if (name) {
            this.name = name;
            if (!this.userId) this.userId = UUID();
            if (!this.username) this.username = `${this.name} ${randomName()}`;
        }
    }
}

@Table
class GoogleLogin extends Entity {
    @PK('METADATA')
    userId: string;

    @SK('FACEBOOK')
    facebookId: string;

    @Attribute()
    profile: any;
}

const main = async function () {
    // --
    const user1 = new User({ name: randomName() });
    await user1.save();
};

main();
