'use strict';

const YAML = require('yaml');
const { Scalar } = require('yaml/types');
const { stringifyString, parseMap, parseSeq } = require('yaml/util');
const parseCST = require('yaml/parse-cst');
const { Readers } = require('./lib/readers');
const readers = Readers();
const isBranch = v => v != null && v.StartAt && v.States != null;
const isState = v => v != null && v.Type != null;
const nonSerializable = v => false;

const identities = {
    branch: isBranch,
    state: isState,
    pass: nonSerializable,
    fail: nonSerializable,
    next: nonSerializable,
    end: nonSerializable,
    '': nonSerializable,
    dupe: nonSerializable,
    '^': nonSerializable,
    parallel: nonSerializable,
    'if': nonSerializable,
    'try': nonSerializable,
    retry: nonSerializable,
    params: nonSerializable,
    '@': nonSerializable
};

function createTag(name, reader) {
    return {
        identify: identities[name],
        tag: `!${name}`,
        resolve(doc, cst) {
            const parsed = YAML.parse(cst.context.src.slice(cst.valueRange.start, cst.valueRange.end));
            return reader(parsed);
        },
        stringify(item, ctx, onComment, onChompKeep) {
            return JSON.stringify(item.value);
        }

    };
}

YAML.defaultOptions.customTags = Object.entries(readers).map(([ name, reader ]) => createTag(name, reader));

module.exports = YAML;

//const testInput = '!params bar';
//const testData = YAML.parse(testInput);
//const testString = YAML.stringify(testData);
//console.log(testData);
//console.log(testString);
