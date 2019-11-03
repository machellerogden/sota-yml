'use strict';

const { filterNilKeys, isObject } = require('../util');
const { renameStateKeys, terminals } = require('./properties');
const { buildChoices } = require('./choices');
const { GenSym } = require('../names');
const nil = void 0;

function Readers({ genSym = GenSym(), resolver = v => nil } = {}) {
    const nameMap = {};

    function getName(resource, generateNewName) {
        const currentName = resource.Name || resource;
        if (generateNewName) return genSym(currentName.split(':').pop());
        if (!currentName.includes(':')) return currentName;
        if (nameMap[currentName]) return nameMap[currentName];
        const Name = currentName.split(':').pop();
        nameMap[currentName] = Name;
        return Name;
    }

    const Task = generateNewName => ({ Resource, Parameters, InputPath, ResultPath }) =>
        filterNilKeys({
            Type: 'Task',
            Name: getName(Resource, generateNewName),
            Parameters,
            InputPath,
            Resource,
            ResultPath
        });

    function resolve(arg) {
        if (typeof arg !== 'string') return arg;
        return resolver(arg) || arg;
    }

    function submachine(name, machine) {
        return {
            Type: 'Parallel',
            Branches: [ machine ],
            Name: genSym(name),
            OutputPath: '$.0[-1:]'
        };
    }

    function shorthand(args, generateNewName) {
        const task = Task(generateNewName);
        const resolved = resolve(args);
        return resolved.StartAt            ? submachine(args, resolved)
             : !Array.isArray(resolved)    ? task({ Resource: resolved })
             : resolved.length === 1       ? task({ Resource: resolved[0] })
             : isObject(resolved[0])       ? task({ Parameters: resolved[0], Resource: resolved[1], ResultPath: resolved[2] })
             : resolved[0].startsWith('$') ? task({ InputPath: resolved[0], Resource: resolved[1], ResultPath: resolved[2] })
             : /* default */             task({ Resource: resolved[0], ResultPath: resolved[1] });
    }

    function applyDefaults(props = {}) {
        let {
            Name,
            Type = 'Task',
            Resource
        } = props;
        if (Type === 'Task') Resource = Name;
        if (Name == null) Name = genSym(Type.toLowerCase());
        if (Resource == null) Type = 'Pass';
        const defaults = filterNilKeys({
            Name,
            Type,
            Resource
        });
        return { ...defaults, ...props };
    }

    function translate(obj) {
        const renamed = renameStateKeys(obj);
        return applyDefaults(renamed);
    }

    function state(obj, { generateNewName = false } = {}) {
        if (typeof obj === 'string' || Array.isArray(obj)) return shorthand(obj, generateNewName);
        if (typeof obj !== 'object') {
            throw new SyntaxError('Invalid state object');
        }
        return translate(obj);
    }

    function dupe(obj) {
        return state(obj, { generateNewName: true });
    }

    function parallel(Branches) {
        if (!Array.isArray(Branches)) Branches = [ Branches ];
        Branches = Branches.map(branch);
        return {
            Name: genSym('parallel'),
            Type: 'Parallel',
            Branches
        };
    }

    function choice(Choices, Default) {
        return {
            Name: genSym('choice'),
            Type: 'Choice',
            Choices,
            Default: getName(Default)
        };
    }

    function _if([[variable, operation, value] = [], consequent, alternate] = []) {
        return choice(buildChoices({ operation, variable, value, consequent: getName(consequent) }), alternate);
    }

    function branch(input) {
        if (input.StartAt) return input;
        const states = Array.isArray(input)
            ? input
            : [ input ];
        const {
            names,
            ...result
        } = states.reduce((accp, s, i, col) => {
            const acc = accp;
            let { Name, ...curr } =
                typeof s === 'string'
                ? shorthand(s)
                : Array.isArray(s)
                    ? parallel(s.map(branch))
                    : s.Name == null
                        ? {
                            Name: genSym((s.Type || '').toLowerCase()),
                            ...s
                          }
                        : s;
            if (i === 0) acc.StartAt = Name;
            if (i > 0) {
                const prev = acc.States[acc.names[i - 1]];
                if (!terminals.has(prev.Type) && (prev.Next == null && prev.End == null)) {
                    prev.Next = Name;
                } else if (!terminals.has(prev.Type) && prev.Next == null) {
                    prev.End = true;
                }
            }
            if (i === col.length - 1 && !terminals.has(curr.Type)) {
                curr.End = true;
            }
            acc.States[Name] = curr;
            acc.names.push(Name);
            return acc;
        }, { names: [], StartAt: null, States: {} });
        return result;
    }

    function pass(Name) {
        return state({ Name, Type: 'Pass' });
    }

    function fail(Name) {
        return state({ Name, Type: 'Fail' });
    }

    function succeed(Name) {
        return state({ Name, Type: 'Succeed' });
    }

    function params(Parameters = {}) {
        const s = typeof Parameters === 'string'
            ? (state({ Type: 'Pass', OutputPath: Parameters }))
            : (state({ Type: 'Pass', Parameters }));
        delete s.ResultPath;
        return s;
    }

    function _try([ input, Next ] = []) {
        const s = state(input);
        const { Name = 'last' } = s;
        return {
            ...s,
            Catch: [
                {
                    ErrorEqual: [ "States.ALL" ],
                    ResultPath: `$.${Name}-error`,
                    Next: getName(Next)
                }
            ]
        };
    }

    function retry([ input, MaxAttempts = 3, IntervalSeconds = 1, BackoffRate = 1 ] = []) {
        const s = state(input);
        return {
            ...s,
            Retry: [
                {
                    ErrorEquals: [ "States.ALL" ],
                    MaxAttempts,
                    IntervalSeconds,
                    BackoffRate
                }
            ]
        };
    }

    function next([ input, Next ]) {
        const { Next:_, ...State } = state(input);
        return { ...State, Next };
    }

    function end(input) {
        const { Next, ...State } = state(input);
        return { ...State, End: true };
    }

    return {
        branch,
        pass,
        fail,
        next,
        end,
        state,
        '@': state,
        dupe,
        '^': dupe,
        parallel,
        'if': _if,
        'try': _try,
        retry,
        params,
        map: params
    };
}

module.exports = {
    Readers
};
