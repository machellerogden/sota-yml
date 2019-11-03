'use strict';

const { EOL } = require('os');

function filterNilKeys(obj) {
    return Object.entries(obj).reduce((acc, [ key, value ]) => {
        if (value != null) acc[key] = value;
        return acc;
    }, {});
}

async function* linebreak(statements) {
    for await (const statement of statements) {
        yield `${statement}${EOL}`;
    }
}

async function* stringify(statements) {
    for await (const statement of statements) {
        yield JSON.stringify(statement);
    }
}

const pipe = (head, ...tail) => (...args) => tail.reduce((v, f) => f(v), head(...args));

function renameKeys(obj, names) {
    return Object.entries(obj).reduce((acc, [ k, v ]) => {
        const key = typeof names[k] === 'function'
            ? names[k](v)
            : names[k];
        if (key) {
            acc[key] = v;
            delete acc[k];
        }
        return acc;
    }, { ...obj });
}

function findBestMatch(str = '', set = []) {
    str = str.toLowerCase();
    let match;
    let bestMatchLength = 0;
    let i = set.length;
    let chars = str.split('');
    while (i-- > 0) {
        const curr = set[i].toLowerCase();
        if (str === curr) return set[i];
        let j = 0;
        while (chars[j] && curr[j] && chars[j] === curr[j]) j++;
        if (j >= bestMatchLength) {
            bestMatchLength = j;
            match = set[i];
        }
    }
    return match;
}

function renameKeysToBestMatch(obj = {}, keys = []) {
    return Object.entries(obj).reduce((acc, [ k, v ]) => {
        const match = findBestMatch(k, keys);
        if (match != null && match != k) {
            acc[match] = v;
            delete acc[k];
        }
        return acc;
    }, obj);
}

const numberTypes = new Set(['string', 'number']);

function isNumeric(value) {
    return numberTypes.has(typeof value) && !isNaN(parseInt(value, 10)) && isFinite(value);
}

const booleanTypes = new Set([ true, false, 'true', 'false' ]);

function isBooleanish(value) {
    return booleanTypes.has(value);
}

function isDateish(value) {
    const d = new Date(value);
    return !isNaN(d.getTime());
}

function isObject(value) {
    return value != null && typeof value === 'object';
}

module.exports = {
    linebreak,
    stringify,
    pipe,
    filterNilKeys,
    renameKeys,
    findBestMatch,
    renameKeysToBestMatch,
    isNumeric,
    isBooleanish,
    isDateish,
    isObject
};
