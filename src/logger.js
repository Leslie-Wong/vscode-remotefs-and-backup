"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const constants_1 = require("./constants");
class VSCodeLogger {
    trace(message, ...args) {
        this._print('[trace]', message, ...args);
    }
    debug(message, ...args) {
        this._print('[debug]', message, ...args);
    }
    info(message, ...args) {
        this._print('[info]', message, ...args);
    }
    warn(message, ...args) {
        this._print('[warn]', message, ...args);
    }
    error(message, ...args) {
        this._print('[error]', message, ...args);
    }
    critical(message, ...args) {
        this._print('[critical]', message, ...args);
    }
    _print(...args) {
        if (!this._outputChannel) {
            this._outputChannel = vscode.window.createOutputChannel(constants_1.EXTENSION_NAME);
        }
        const msg = args
            .map(arg => {
            if (arg instanceof Error) {
                return arg.stack;
            }
            else if (typeof arg === 'object') {
                return JSON.stringify(arg);
            }
            return arg;
        })
            .join(' ');
        this._outputChannel.appendLine(msg);
    }
}
const logger = new VSCodeLogger();
exports.default = logger;
//# sourceMappingURL=logger.js.map