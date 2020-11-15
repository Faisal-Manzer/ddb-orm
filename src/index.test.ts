import {hello} from './index';

describe('Basic', () => {
    test('hello without agrs', () => {
        expect(hello()).toEqual('Hello world!')
    });

    test('hello with agrs', () => {
        expect(hello('John')).toEqual('Hello John!')
    });
});
