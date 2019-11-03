'use strict';

function* NameGen(key = '') {
    if (!key.length) key = 'sym';
    const counters = {};
    while (true) {
        if (counters[key] == null) counters[key] = 0;
        yield `${key}_${counters[key]++}`;
    }
}

function GenSym() {
    const keys = {};
    return function NameFactory(key) {
        let iter = keys[key] = keys[key] || NameGen(key);
        return iter.next().value;
    };
}

module.exports = {
    GenSym
};
