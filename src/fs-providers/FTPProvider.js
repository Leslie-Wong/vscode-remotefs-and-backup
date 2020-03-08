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
const Ftp = require("jsftp");
const PQueue = require("p-queue");
const host_1 = require("../host");
const RemoteFileSystemProvider_1 = require("../core/RemoteFileSystemProvider");
var FtpFileType;
(function (FtpFileType) {
    FtpFileType[FtpFileType["FILE_TYPE"] = 0] = "FILE_TYPE";
    FtpFileType[FtpFileType["DIRECTORY_TYPE"] = 1] = "DIRECTORY_TYPE";
    FtpFileType[FtpFileType["SYMBOLIC_LINK_TYPE"] = 2] = "SYMBOLIC_LINK_TYPE";
    FtpFileType[FtpFileType["UNKNOWN_TYPE"] = 3] = "UNKNOWN_TYPE";
})(FtpFileType || (FtpFileType = {}));
function getFileType(type) {
    switch (type) {
        case 1:
            return vscode.FileType.Directory;
        case 0:
            return vscode.FileType.File;
        case 2:
            return vscode.FileType.SymbolicLink;
        default:
            return vscode.FileType.Unknown;
    }
}
class FTPFSProvider extends RemoteFileSystemProvider_1.default {
    constructor() {
        super(...arguments);
        this._queue = new PQueue({ concurrency: 1 });
    }
    connect(remote) {
        return __awaiter(this, void 0, void 0, function* () {
            let password = remote.password;
            // tslint:disable triple-equals
            const shouldPromptForPass = password == undefined;
            // tslint:enable
            if (shouldPromptForPass) {
                // modify remote so we don't need later
                password = yield host_1.promptForPassword('Enter your password');
            }
            const { connectTimeout, host, port, username } = remote;
            return this._connectClient({
                host,
                port,
                user: username,
                pass: password,
                timeout: connectTimeout,
            });
        });
    }
    isFileExist(uri, client) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this._stat(uri, client);
                return true;
            }
            catch (_a) {
                return false;
            }
        });
    }
    $stat(uri, client) {
        return __awaiter(this, void 0, void 0, function* () {
            const stat = yield this._stat(uri, client);
            return {
                type: getFileType(stat.type),
                ctime: 0,
                mtime: stat.time,
                size: stat.size,
            };
        });
    }
    $readDirectory(uri, client) {
        return __awaiter(this, void 0, void 0, function* () {
            const entries = yield this._readdir(uri.path, client);
            return entries.map(entry => [entry.name, getFileType(entry.type)]);
        });
    }
    $createDirectory(uri, client) {
        return this._createDirAtomic(uri.path, client);
    }
    $readFile(uri, client) {
        return this._readFileAtomic(uri.path, client);
    }
    $writeFile(uri, content, client) {
        return this._wrireFileAtomic(uri.path, content, client);
    }
    $delete(uri, options, client) {
        return __awaiter(this, void 0, void 0, function* () {
            const { recursive } = options;
            const stat = yield this.$stat(uri, client);
            if (stat.type === vscode.FileType.Directory) {
                return this._deleteDir(uri, recursive, client);
            }
            return this._deleteFile(uri, client);
        });
    }
    $rename(oldUri, newUri, client) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this._RNFRAtomic(oldUri.path, client);
            yield this._RNTOAtomic(newUri.path, client);
        });
    }
    _connectClient(option) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                const client = new Ftp({
                    host: option.host,
                    port: option.port,
                });
                client.socket.setTimeout(option.timeout);
                // caution: privete property
                // set pasv timeout
                client.timeout = option.timeout;
                client.keepAlive(1000 * 10);
                client.onEnd = cb => {
                    client.socket.once('end', cb);
                    client.socket.once('close', cb);
                    client.socket.once('error', cb);
                };
                client.end = () => {
                    client.destroy();
                };
                client.auth(option.user, option.pass, err => {
                    if (err) {
                        return reject(err);
                    }
                    return resolve(client);
                });
            });
        });
    }
    _stat(uri, client) {
        return __awaiter(this, void 0, void 0, function* () {
            if (uri.path === '/') {
                return {
                    name: '/',
                    type: FtpFileType.DIRECTORY_TYPE,
                    time: 0,
                    size: 0,
                };
            }
            const name = upath.basename(uri.path);
            const dir = upath.dirname(uri.path);
            const entries = yield this._readdir(dir, client);
            const target = entries.find(entry => entry.name === name);
            if (!target) {
                throw RemoteFileSystemProvider_1.FileSystemError.FileNotFound(uri);
            }
            return target;
        });
    }
    _readdir(dir, client) {
        return this._readdirAtomic(dir, client);
    }
    _deleteFile(uri, client) {
        return this._deleteFileAtomic(uri.path, client);
    }
    _deleteDir(uri, recursive, client) {
        if (!recursive) {
            return this._deleteDirAtomic(uri.path, client);
        }
        return new Promise((resolve, reject) => {
            this.$readDirectory(uri, client).then(fileEntries => {
                const rmPromises = fileEntries.map(([filename, fileType]) => {
                    const childUri = uri.with({ path: upath.join(uri.path, filename) });
                    if (fileType === vscode.FileType.Directory) {
                        return this._deleteDir(childUri, true, client);
                    }
                    return this._deleteFile(childUri, client);
                });
                Promise.all(rmPromises)
                    .then(() => this._deleteDirAtomic(uri.path, client))
                    .then(resolve, reject);
            }, err => {
                reject(err);
            });
        });
    }
    _readdirAtomic(dir, client) {
        const task = () => new Promise((resolve, reject) => {
            client.ls(dir, (err, entries) => {
                if (err) {
                    return reject(err);
                }
                resolve(entries.map(entry => (Object.assign({}, entry, { size: Number(entry.size) }))));
            });
        });
        return this._queue.add(task);
    }
    _deleteFileAtomic(path, client) {
        const task = () => new Promise((resolve, reject) => {
            client.raw('DELE', path, err => {
                if (err) {
                    return reject(err);
                }
                resolve();
            });
        });
        return this._queue.add(task);
    }
    _deleteDirAtomic(path, client) {
        const task = () => new Promise((resolve, reject) => {
            client.raw('RMD', path, err => {
                if (err) {
                    return reject(err);
                }
                resolve();
            });
        });
        return this._queue.add(task);
    }
    _readFileAtomic(path, client) {
        const task = () => new Promise((resolve, reject) => {
            client.get(path, (err, socket) => {
                if (err) {
                    return reject(err);
                }
                const arr = [];
                const onData = chunk => {
                    arr.push(chunk);
                };
                const onEnd = _err => {
                    if (_err) {
                        reject(_err);
                        return;
                    }
                    resolve(Uint8Array.from(Buffer.concat(arr)));
                };
                socket.on('data', onData);
                socket.on('close', onEnd);
                socket.resume();
            });
        });
        return this._queue.add(task);
    }
    _wrireFileAtomic(path, content, client) {
        const task = () => new Promise((resolve, reject) => {
            client.put(content, path, err => {
                if (err) {
                    return reject(err);
                }
                resolve();
            });
        });
        return this._queue.add(task);
    }
    _createDirAtomic(path, client) {
        const task = () => new Promise((resolve, reject) => {
            client.raw('MKD', path, err => {
                if (err) {
                    return reject(err);
                }
                resolve();
            });
        });
        return this._queue.add(task);
    }
    _RNFRAtomic(path, client) {
        const task = () => new Promise((resolve, reject) => {
            client.raw('RNFR', path, err => {
                if (err) {
                    return reject(err);
                }
                resolve();
            });
        });
        return this._queue.add(task);
    }
    _RNTOAtomic(path, client) {
        const task = () => new Promise((resolve, reject) => {
            client.raw('RNTO', path, err => {
                if (err) {
                    return reject(err);
                }
                resolve();
            });
        });
        return this._queue.add(task);
    }
}
exports.default = FTPFSProvider;
//# sourceMappingURL=FTPProvider.js.map