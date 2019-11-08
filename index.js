#!/usr/bin/env node
'use strict';

const YAML = require('yaml');
const { Scalar } = require('yaml/types');
const { stringifyString, parseMap, parseSeq } = require('yaml/util');
const parseCST = require('yaml/parse-cst');
const streamify = require('async-stream-generator');
const { EOL } = require('os');

const { linebreak, stringify, pipe } = require('./lib/util');
const { Readers } = require('./lib/readers');
const readers = Readers();
const isBranch = v => v != null && v.StartAt && v.States != null;
const isState = v => v != null && v.Type != null;
const nonSerializable = v => false;

// with enough consideration, we could write serializers for everything ... but let's not for now
const identities = {
    //branch: isBranch,
    //state: isState,
    branch: nonSerializable,
    state: nonSerializable,
    pass: nonSerializable,
    fail: nonSerializable,
    next: nonSerializable,
    end: nonSerializable,
    '@': nonSerializable,
    dupe: nonSerializable,
    '^': nonSerializable,
    parallel: nonSerializable,
    'if': nonSerializable,
    'try': nonSerializable,
    retry: nonSerializable,
    params: nonSerializable,
    map: nonSerializable
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

async function* split(chunks) {
    let previous = '';

    for await (const chunk of chunks) {
        previous += chunk;
        let eolIndex;
        if (!previous.includes(EOL)) {
            yield `${previous}${EOL}`;
            previous = '';
            continue;
        }
        while ((eolIndex = previous.indexOf(EOL)) >= 0) {
            const line = previous.slice(0, eolIndex);
            yield `${line}${EOL}`;
            previous = previous.slice(eolIndex + 1);
        }
    }

    if (previous.length > 0) {
        yield `${previous}${EOL}`;
    }
}

async function* parse(chunks) {
    try {
        for await (const chunk of chunks) {
            const line = chunk.toString();
            yield YAML.parse(line);
        }
    } catch (e) {
        console.error(e.stack);
        process.exit(1);
    }
}

function read(data, opts) {
    const input = data[Symbol.asyncIterator]
        ? data
        : Array.isArray(data)
            ? data.values()
            : [ data ].values();
    return parse(input);
}

const inferBranch = branch =>
    branch.length === 1 && branch[0].StartAt
        ? branch[0]
        : branch;

async function readAll(data = '') {
    const results = [];
    for await (const result of read(data)) {
        results.push(result);
    }
    return readers.branch(inferBranch(results));
}

const readToStream = pipe(read, stringify, linebreak, streamify);

const testInput = '!^ bar';

require('streamface').wrap({ readToStream, readAll, module });
