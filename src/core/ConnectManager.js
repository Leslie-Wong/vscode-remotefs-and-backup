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
const logger_1 = require("../logger");
const findRemote_1 = require("../helpers/findRemote");
const getRemoteIdentityFromUri_1 = require("../helpers/getRemoteIdentityFromUri");
var ConnectStatus;
(function (ConnectStatus) {
    ConnectStatus[ConnectStatus["PENDING"] = 1] = "PENDING";
    ConnectStatus[ConnectStatus["DONE"] = 2] = "DONE";
    ConnectStatus[ConnectStatus["END"] = 3] = "END";
})(ConnectStatus || (ConnectStatus = {}));
class ConnectManager {
    constructor() {
        this._connMap = new Map();
        this._connStatusMap = new Map();
    }
    connecting(uri, connect) {
        return __awaiter(this, void 0, void 0, function* () {
            const id = getRemoteIdentityFromUri_1.default(uri);
            const status = this._connStatusMap.get(id);
            if (status === ConnectStatus.DONE || status === ConnectStatus.PENDING) {
                const client = this._connMap.get(id);
                if (!client) {
                    throw new Error('unkonw error!');
                }
                return client;
            }
            const remote = findRemote_1.findRemoteByUri(uri);
            if (!remote) {
                // todo error report
                // tslint:disable-next-line quotemark
                throw new Error("can't find remote");
            }
            this._connStatusMap.set(id, ConnectStatus.PENDING);
            const connPromise = connect(remote)
                .then(client => {
                logger_1.default.trace('connect to', id);
                const connectInstance = {
                    id: remote.name,
                    name: remote.name,
                    wd: remote.rootPath,
                    client,
                };
                this._connStatusMap.set(id, ConnectStatus.DONE);
                this._connMap.set(id, connectInstance);
                client.onEnd(() => this._handleConnectEnd(connectInstance));
                return connectInstance;
            })
                .catch(error => {
                this._connStatusMap.set(id, ConnectStatus.END);
                throw error;
            });
            this._connMap.set(id, connPromise);
            return connPromise;
        });
    }
    destroy() {
        for (const connect of this._connMap.values()) {
            if (connect.client) {
                connect.client.end();
            }
        }
    }
    _handleConnectEnd(client) {
        this._connStatusMap.set(client.id, ConnectStatus.END);
        this._connMap.delete(client.id);
    }
}
exports.default = ConnectManager;
//# sourceMappingURL=ConnectManager.js.map