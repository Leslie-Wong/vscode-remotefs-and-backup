"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("../core/config");
function findRemoteByUri(uri) {
    const remoteList = config_1.getRemoteList();
    return remoteList.find(remote => remote.name === uri.authority);
}
exports.findRemoteByUri = findRemoteByUri;
function findRemoteByName(name) {
    const remoteList = config_1.getRemoteList();
    return remoteList.find(remote => remote.name === name);
}
exports.findRemoteByName = findRemoteByName;
//# sourceMappingURL=findRemote.js.map