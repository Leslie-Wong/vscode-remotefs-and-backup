"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const upath = require("upath");
const logger_1 = require("../logger");
const findRemote_1 = require("../helpers/findRemote");
// var mkdirp = require('mkdirp');
var fsPath = require('fs-path');
// var getDirName = require('path').dirname;
// import { removeWorkspace } from '../host';
const toAbsoluteUri_1 = require("../helpers/toAbsoluteUri");
const reportError_1 = require("../helpers/reportError");
const ConnectManager_1 = require("./ConnectManager");
const config_1 = require("./config");
var ErrorCode;
(function (ErrorCode) {
    ErrorCode[ErrorCode["FILE_NOT_FOUND"] = 2] = "FILE_NOT_FOUND";
    ErrorCode[ErrorCode["PERMISSION_DENIED"] = 3] = "PERMISSION_DENIED";
    ErrorCode[ErrorCode["FILE_EXISTS"] = 4] = "FILE_EXISTS";
})(ErrorCode = exports.ErrorCode || (exports.ErrorCode = {}));
class FileSystemError {
    static FileNotFound(uri) {
        return vscode.FileSystemError.FileNotFound(`${uri.path} not found`);
    }
    static NoPermissions(uri) {
        return vscode.FileSystemError.NoPermissions(`${uri.path} no permissions`);
    }
    static FileExists(uri) {
        return vscode.FileSystemError.FileExists(`${uri.path} already exists`);
    }
}
exports.FileSystemError = FileSystemError;
class RemoteFileSystemProvider {
    constructor() {
        this._connectManager = new ConnectManager_1.default();
        this._emitter = new vscode.EventEmitter();
        this._bufferedEvents = [];
        this.onDidChangeFile = this._emitter.event;
        this.connect = this.connect.bind(this);
    }
    // abstract $copy?(source: vscode.Uri, destination: vscode.Uri, options: { overwrite: boolean }): Thenable<void>;
    stat(uri) {
        return __awaiter(this, void 0, void 0, function* () {
            logger_1.default.trace('stat', uri.path);
            const connect = yield this._connect(uri);
            try {
                return yield this.$stat(toAbsoluteUri_1.default(uri, connect.wd), connect.client);
            }
            catch (error) {
                if (error.code === ErrorCode.FILE_NOT_FOUND) {
                    error = FileSystemError.FileNotFound(uri);
                }
                // fixme vscode will try find .vscode, pom.xml..., don't bother user when there file not f=ound
                // reportError(error);
                throw error;
            }
        });
    }
    readDirectory(uri) {
        return __awaiter(this, void 0, void 0, function* () {
            logger_1.default.trace('readDirectory', uri.path);
            const connect = yield this._connect(uri);
            try {
                return yield this.$readDirectory(toAbsoluteUri_1.default(uri, connect.wd), connect.client);
            }
            catch (error) {
                if (error.code === ErrorCode.FILE_NOT_FOUND) {
                    error = FileSystemError.FileNotFound(uri);
                }
                reportError_1.default(error);
                throw error;
            }
        });
    }
    createDirectory(uri) {
        return __awaiter(this, void 0, void 0, function* () {
            logger_1.default.trace('createDirectory', uri.path);
            const connect = yield this._connect(uri);
            try {
                yield this.$createDirectory(toAbsoluteUri_1.default(uri, connect.wd), connect.client);
            }
            catch (error) {
                if (error.code === ErrorCode.FILE_NOT_FOUND) {
                    error = FileSystemError.FileNotFound(uri);
                }
                if (error.code === ErrorCode.PERMISSION_DENIED) {
                    error = FileSystemError.NoPermissions(uri);
                }
                if (error.code === ErrorCode.FILE_EXISTS) {
                    error = FileSystemError.FileExists(uri);
                }
                reportError_1.default(error);
                throw error;
            }
            const dirname = uri.with({ path: upath.dirname(uri.path) });
            this._fireSoon({ type: vscode.FileChangeType.Changed, uri: dirname }, { type: vscode.FileChangeType.Created, uri });
        });
    }
    readFile(uri) {
        return __awaiter(this, void 0, void 0, function* () {
            logger_1.default.trace('readFile', uri.path);
            const connect = yield this._connect(uri);
            // this.backup('/Users/leslie/Documents/back-end/remote backup'+uri.path, connect, function (err) {
            //     if (err)
            //         console.log("Backup File Error:" + err);
            //     else
            //         console.log('Backup File Error: Write operation complete.');
            // });
            
            try {
                let content = yield this.$readFile(toAbsoluteUri_1.default(uri, connect.wd), connect.client);
                // fsPath.writeFile('/Users/leslie/Documents/back-end/remote backup'+uri.path, new TextDecoder("utf-8").decode(content), function(err){
                //     if(err) {
                //         //   throw err;
                //         console.log("Backup File Error:" + err);
                //     } else {
                //       console.log('Backup File: Write backup file complete.');
                //     }
                // });
                return content;
            }
            catch (error) {
                if (error.code === ErrorCode.FILE_NOT_FOUND) {
                    error = FileSystemError.FileNotFound(uri);
                }
                // fixme vscode will try find .vscode, pom.xml..., don't bother user when there file not f=ound
                // reportError(error);
                throw error;
            }
        });
    }
    writeFile(uri, content, options) {
        return __awaiter(this, void 0, void 0, function* () {
            logger_1.default.trace('writeFile', uri.path);
            const connect = yield this._connect(uri);
            const absolute = toAbsoluteUri_1.default(uri, connect.wd);
            const isExist = yield this.isFileExist(absolute, connect.client);
            if (!isExist && !options.create) {
                const error = FileSystemError.FileNotFound(uri);
                reportError_1.default(error);
                throw error;
            }
            if (isExist && options.create && !options.overwrite) {
                const error = FileSystemError.FileExists(uri);
                reportError_1.default(error);
                throw error;
            }
            var path = findRemote_1.findRemoteByUri(uri);
            fsPath.writeFile(path.backPath + uri.path, new TextDecoder("utf-8").decode(content), function(err){
                if(err) {
                    //   throw err;
                    console.log("Backup File Error:" + err);
                } else {
                  console.log('Backup File: Write backup file complete.');
                }
            });
            try {
                yield this.$writeFile(absolute, content, connect.client);
            }
            catch (error) {
                if (error.code === ErrorCode.PERMISSION_DENIED) {
                    error = FileSystemError.NoPermissions(uri);
                }
                reportError_1.default(error);
                throw error;
            }
            if (!isExist) {
                this._fireSoon({ type: vscode.FileChangeType.Created, uri });
            }
            this._fireSoon({ type: vscode.FileChangeType.Changed, uri });
        });
    }
    delete(uri, options) {
        return __awaiter(this, void 0, void 0, function* () {
            logger_1.default.trace('delete', uri.path);
            const connect = yield this._connect(uri);
            try {
                yield this.$delete(toAbsoluteUri_1.default(uri, connect.wd), options, connect.client);
            }
            catch (error) {
                if (error.code === ErrorCode.FILE_NOT_FOUND) {
                    error = FileSystemError.FileNotFound(uri);
                }
                if (error.code === ErrorCode.PERMISSION_DENIED) {
                    error = FileSystemError.NoPermissions(uri);
                }
                reportError_1.default(error);
                throw error;
            }
            const dirname = uri.with({ path: upath.dirname(uri.path) });
            this._fireSoon({ type: vscode.FileChangeType.Changed, uri: dirname }, { uri, type: vscode.FileChangeType.Deleted });
        });
    }
    rename(oldUri, newUri, options) {
        return __awaiter(this, void 0, void 0, function* () {
            logger_1.default.trace('rename', oldUri.path, newUri.path);
            const connect = yield this._connect(oldUri);
            const { overwrite } = options;
            if (!overwrite) {
                const isExist = yield this.isFileExist(newUri, connect.client);
                if (isExist) {
                    const error = FileSystemError.FileExists(newUri);
                    reportError_1.default(error);
                    throw error;
                }
            }
            try {
                yield this.$rename(toAbsoluteUri_1.default(oldUri, connect.wd), toAbsoluteUri_1.default(newUri, connect.wd), connect.client);
            }
            catch (error) {
                reportError_1.default(error);
                throw error;
            }
            this._fireSoon({ type: vscode.FileChangeType.Deleted, uri: oldUri }, { type: vscode.FileChangeType.Created, uri: newUri });
        });
    }
    watch(resource, opts) {
        // ignore, fires for all changes...
        return new vscode.Disposable(() => undefined);
    }
    destroy() {
        this._connectManager.destroy();
    }
    _connect(uri) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield this._connectManager.connecting(uri, this.connect);
            }
            catch (error) {
                // todo: ux avoid annoy loadding
                // removeWorkspace(uri);
                reportError_1.default(error);
            }
        });
    }
    _fireSoon(...events) {
        this._bufferedEvents.push(...events);
        clearTimeout(this._fireSoonHandle);
        this._fireSoonHandle = setTimeout(() => {
            this._emitter.fire(this._bufferedEvents);
            this._bufferedEvents.length = 0;
        }, 5);
    }
    // backup(path, contents, cb) {
    //     mkdirp(getDirName(path), function (err) {
    //         if (err) return cb(err);
        
    //         fs.writeFile(path, contents, cb);
    //     });
    // }
}
exports.default = RemoteFileSystemProvider;
//# sourceMappingURL=RemoteFileSystemProvider.js.map