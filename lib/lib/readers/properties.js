'use strict';

const {
    filterNilKeys,
    findBestMatch,
    renameKeysToBestMatch
} = require('../util');

/**
 * NB, in priority order
 * ambiguous matches resolve to lower index
 * i.e. 'n' will prefer 'Name' match over 'Next' match
 */
const validProperties = [
    'Type',
    'InputPath',
    'OutputPath',
    'Resource',
    'Result',
    'ResultPath',
    'Retry',
    'Parameters',
    'Name',
    'Next',
    'End',
    'Branches',
    'Catch',
    'Choices',
    'Default',
    'TimeoutSeconds',
    'HeartbeatSeconds',
    'Seconds',
    'SecondsPath',
    'Timestamp',
    'TimestampPath',
    'Cause',
    'Error',
    'Comment'
];

const terminals = new Set([
    'Choice',
    'Succeed',
    'Fail'
]);

function renameResultIfPath(obj = {}) {
    if (typeof obj.Result === 'string' && obj.Result.startsWith('$.')) {
        obj.ResultPath = obj.Result;
        delete obj.Result;
    }
    if (typeof obj.Resource === 'object') {
        obj.Result = obj.Resource;
        delete obj.Resource;
    }
    return obj;
}

function renameStateKeys(state) {
    return renameResultIfPath(renameKeysToBestMatch(state, validProperties));
}

module.exports = { renameStateKeys, terminals };
