console.time('Execution');

import { Attribute, Key, TableFactory, Entity } from './index';
import { randomName, UUID, snakeCase, toTitleCase } from './utils';

const PK = Key({ key: 'PK', sortKey: 'SK', isPrimaryIndex: true });
const SK = Key({ key: 'SK', sortKey: 'PK', index: 'InvertedIndex' });
const GPK = Key({ key: 'GPK', sortKey: 'GSK', index: 'GSIOne' });
const GSK = Key({ key: 'GSK' });

const Table = TableFactory({
    name: 'TestTable',
    keys: [PK, SK, GPK, GSK],
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
    console.time('Main');

    console.log(await User.findOne({ username: 'noxious_woodworkers_inveterate_rainbows' }));
    console.timeEnd('Main');
};

main().then(() => console.timeEnd('Execution'));
