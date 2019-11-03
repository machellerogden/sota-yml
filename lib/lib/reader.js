'use strict';

const pdn = require('pdn');
const streamify = require('async-stream-generator');
const { linebreak, stringify, pipe } = require('./util');
const { Readers } = require('./readers');

const inferBranch = branch =>
    branch.length === 1 && branch[0].StartAt
        ? branch[0]
        : branch;

function read(input, opts = {}) {
    const readers = Readers(opts);
    const pdnOpts = { readers };

    async function* branch(states) {
        const resolved = [];
        for await (const state of states) {
            resolved.push(state);
        }
        yield readers.branch(inferBranch(resolved));
    }

    return branch(pdn.read(input, pdnOpts));
}

async function readAll(input, opts = {}) {
    const readers = Readers(opts);
    const pdnOpts = { readers };
    const branch = await pdn.readAll(input, pdnOpts);
    return readers.branch(inferBranch(branch));
}

const readToStream = pipe(read, stringify, linebreak, streamify);

module.exports = {
    read,
    readAll,
    readToStream
};
