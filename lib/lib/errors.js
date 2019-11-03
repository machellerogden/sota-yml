'use strict';

class SyntaxError extends Error {
    constructor(message, cause, ...args) {
        super(message, cause, ...args);
        Error.captureStackTrace(this, SyntaxError);
        this.name = 'SyntaxError';
        this.code = 'SYNTAX';
        if (cause) this.cause = cause;
    }
}

module.exports = {
    SyntaxError
};
