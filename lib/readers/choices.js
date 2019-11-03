'use strict';
const { isDateish, isNumeric, isBooleanish } = require('../util');

function getTypePrefixes(value) {
    return [
        'String',
        isNumeric(value) && 'Numeric',
        isBooleanish(value) && 'Boolean',
        isDateish(value) && 'Timestamp'
    ].filter(v => v);
}

const strictOperationMap = {
    'str=': 'StringEquals',
    'num=': 'NumericEquals',
    'time=': 'TimestampEquals',
    'str>': 'StringGreaterThan',
    'num>': 'NumericGreaterThan',
    'time>': 'TimestampGreaterThan',
    'str>=': 'StringGreaterThanEquals',
    'num>=': 'NumericGreaterThanEquals',
    'time>=': 'TimestampGreaterThanEquals',
    'str<': 'StringLessThan',
    'num<': 'NumericLessThan',
    'time<': 'TimestampLessThan',
    'str<=': 'StringLessThanEquals',
    'num<=': 'NumericLessThanEquals',
    'time<=': 'TimestampLessThanEquals'
};

const strictOperations = new Set(Object.keys(strictOperationMap));

const operationMap = {
    '=': 'Equals',
    '==': 'Equals',
    '>': 'GreaterThan',
    '>=': 'GreaterThanEquals',
    '<': 'LessThan',
    '<=': 'LessThanEquals'
};

function buildChoice({ operation, variable, value, consequent }) {
    return {
        Variable: variable,
        [operation]: value,
        Next: consequent
    };
}

function buildChoices({ operation, variable, value, consequent }) {
    if (strictOperations.has(operation)) {
        const choice = buildChoice({
            operation: strictOperationMap[operation],
            value,
            consequent
        });
        return  [ choice ];
    }
    const op = operationMap[operation];
    if (op == null) throw new SyntaxError('invalid operation');
    const prefixes = getTypePrefixes(value);
    return prefixes.map(prefix => buildChoice({
        variable,
        operation: `${prefix}${op}`,
        value: prefix === 'String'
            ? String(value)
            : value,
        consequent
    }));
}

module.exports = {
    buildChoices
};
