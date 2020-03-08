"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) if (e.indexOf(p[i]) < 0)
            t[p[i]] = s[p[i]];
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const upath = require("upath");
const fs = require("fs");
const ssh2_1 = require("ssh2");
const host_1 = require("../host");
const RemoteFileSystemProvider_1 = require("../core/RemoteFileSystemProvider");
function readfile(fspath) {
    return new Promise((resolve, reject) => {
        fs.readFile(fspath, (err, data) => {
            if (err) {
                return reject(err);
            }
            resolve(data);
        });
    });
}
function getFileType(stat) {
    if (stat.isDirectory()) {
        return vscode.FileType.Directory;
    }
    else if (stat.isFile()) {
        return vscode.FileType.File;
    }
    else if (stat.isSymbolicLink()) {
        return vscode.FileType.SymbolicLink;
    }
    else {
        return vscode.FileType.Unknown;
    }
}
class SFTPFSProvider extends RemoteFileSystemProvider_1.default {
    connect(remote) {
        return __awaiter(this, void 0, void 0, function* () {
            // tslint:disable triple-equals
            const shouldPromptForPass = remote.password == undefined &&
                remote.agent == undefined &&
                remote.privateKeyPath == undefined;
            // tslint:enable
            if (shouldPromptForPass) {
                // modify remote so we don't need later
                remote.password = yield host_1.promptForPassword('Enter your password');
            }
            // explict compare to true, cause we want to distinct between string and true
            if (remote.passphrase === true) {
                // modify remote so we don't need later
                remote.passphrase = yield host_1.promptForPassword('Enter your passphrase');
            }
            const { interactiveAuth, connectTimeout, privateKeyPath } = remote, connectOption = __rest(remote, ["interactiveAuth", "connectTimeout", "privateKeyPath"]);
            connectOption.tryKeyboard = interactiveAuth;
            connectOption.readyTimeout = connectTimeout;
            connectOption.keepaliveInterval = 1000 * 30;
            connectOption.keepaliveCountMax = 2;
            if (privateKeyPath) {
                connectOption.privateKey = yield readfile(privateKeyPath);
            }
            return this._connectClient(connectOption);
        });
    }
    isFileExist(uri, client) {
        return new Promise((resolve, reject) => {
            client.stat(uri.path, err => {
                if (err) {
                    resolve(false);
                    return;
                }
                resolve(true);
            });
        });
    }
    $stat(uri, client) {
        return new Promise((resolve, reject) => {
            client.lstat(uri.path, (err, stat) => {
                if (err) {
                    return reject(err);
                }
                const filetype = getFileType(stat);
                // vscode-fixme vscode have porblem with symbolicLink, convert it to realtype
                if (filetype === vscode.FileType.SymbolicLink) {
                    return this._realFileType(uri, client)
                        .then(realtype => ({
                        type: realtype,
                        ctime: 0,
                        mtime: stat.mtime * 1000,
                        size: stat.size,
                    }))
                        .then(resolve, reject);
                }
                resolve({
                    type: filetype,
                    ctime: 0,
                    mtime: stat.mtime * 1000,
                    size: stat.size,
                });
            });
        });
    }
    $readDirectory(uri, client) {
        return new Promise((resolve, reject) => {
            client.readdir(uri.path, (err, stats) => {
                if (err) {
                    return reject(err);
                }
                // vscode-fixme vscode have porblem with symbolicLink, convert it to realtype
                const promises = stats.map(stat => {
                    const filename = stat.filename;
                    const fileType = getFileType(stat.attrs);
                    if (fileType === vscode.FileType.SymbolicLink) {
                        return this._realFileType(uri.with({ path: upath.join(uri.path, filename) }), client).then(realType => [filename, realType]);
                    }
                    return Promise.resolve([filename, fileType]);
                });
                Promise.all(promises).then(resolve, reject);
            });
        });
    }
    $createDirectory(uri, client) {
        return new Promise((resolve, reject) => {
            client.mkdir(uri.path, err => {
                if (err) {
                    return reject(err);
                }
                resolve();
            });
        });
    }
    $readFile(uri, client) {
        return new Promise((resolve, reject) => {
            const stream = client.createReadStream(uri.path);
            const arr = [];
            const onData = chunk => {
                arr.push(chunk);
            };
            const onEnd = err => {
                if (err) {
                    return reject(err);
                }
                resolve(Uint8Array.from(Buffer.concat(arr)));
            };
            stream.on('data', onData);
            stream.on('error', onEnd);
            stream.on('end', onEnd);
        });
    }
    // $createFile(uri: vscode.Uri, client: ConnectClient): Thenable<void> {
    //   return new Promise((resolve, reject) => {
    //     const stream = client.createWriteStream(uri.path);
    //     const onEnd = err => {
    //       if (err) {
    //         reject(err);
    //         return;
    //       }
    //       resolve();
    //     };
    //     stream.on('error', onEnd);
    //     stream.on('finish', onEnd);
    //     stream.end();
    //   });
    // }
    $writeFile(uri, content, client) {
        return new Promise((resolve, reject) => {
            client.stat(uri.path, (statErr, stat) => {
                const mode = statErr ? 0o666 : stat.mode;
                const stream = client.createWriteStream(uri.path, { mode });
                const onEnd = err => {
                    if (err) {
                        return reject(err);
                    }
                    resolve();
                };
                stream.on('error', onEnd);
                stream.on('finish', onEnd);
                stream.end(content);
            });
        });
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
        return new Promise((resolve, reject) => {
            client.rename(oldUri.path, newUri.path, err => {
                if (err) {
                    return reject(err);
                }
                resolve();
            });
        });
    }
    _connectClient(option) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                const client = new ssh2_1.Client();
                client
                    .on('ready', () => {
                    client.sftp((err, sftp) => {
                        if (err) {
                            reject(err);
                        }
                        sftp.onEnd = cb => {
                            return client.on('end', cb);
                        };
                        sftp.end = () => {
                            return client.end();
                        };
                        resolve(sftp);
                    });
                })
                    .on('error', err => {
                    reject(err);
                })
                    .connect(option);
            });
        });
    }
    _realFileType(uri, client) {
        return __awaiter(this, void 0, void 0, function* () {
            let type;
            try {
                const realPath = yield this._realPath(uri.path, client);
                const stat = yield this.$stat(uri.with({ path: realPath }), client);
                type = stat.type;
            }
            catch (_) {
                // suppress error, fallback to Unknown for UX
                type = vscode.FileType.Unknown;
            }
            return type;
        });
    }
    _realPath(path, client) {
        return new Promise((resolve, reject) => {
            client.realpath(path, (err, target) => {
                if (err) {
                    return reject(err);
                }
                resolve(upath.resolve(path, target));
            });
        });
    }
    _deleteFile(uri, client) {
        return new Promise((resolve, reject) => {
            client.unlink(uri.path, err => {
                if (err) {
                    return reject(err);
                }
                resolve();
            });
        });
    }
    _deleteDir(uri, recursive, client) {
        return new Promise((resolve, reject) => {
            if (!recursive) {
                client.rmdir(uri.path, err => {
                    if (err) {
                        return reject(err);
                    }
                    resolve();
                });
                return;
            }
            this.$readDirectory(uri, client).then(fileEntries => {
                // empty dir
                // if (!fileEntries.length) {
                //   this._deleteDir(uri, false, client).then(resolve, e => {
                //     reject(e);
                //   });
                //   return;
                // }
                const rmPromises = fileEntries.map(([filename, fileType]) => {
                    const childUri = uri.with({ path: upath.join(uri.path, filename) });
                    if (fileType === vscode.FileType.Directory) {
                        return this._deleteDir(childUri, true, client);
                    }
                    return this._deleteFile(childUri, client);
                });
                Promise.all(rmPromises)
                    .then(() => this._deleteDir(uri, false, client))
                    .then(resolve, reject);
            }, err => {
                reject(err);
            });
        });
    }
}
exports.default = SFTPFSProvider;
//# sourceMappingURL=SFTPFSProvider.js.map