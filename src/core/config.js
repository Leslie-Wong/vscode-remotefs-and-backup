"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const host_1 = require("../host");
const defaultConfig = {
    rootPath: '/',
    connectTimeout: 1000 * 10,
};
var backPath = "";
function withDefault(name, remote) {
    const copy = Object.assign({}, defaultConfig, remote);
    copy.name = name.toLowerCase();
    copy.scheme = copy.scheme.toLowerCase();
    // tslint:disable-next-line triple-equals
    if (copy.port == undefined) {
        switch (copy.scheme) {
            case 'sftp':
                copy.port = 22;
                break;
            case 'ftp':
                copy.port = 21;
                break;
            default:
                break;
        }
    }
    return copy;
}
function getRemoteList() {
    const userConfig = host_1.getUserSetting();
    const remote = userConfig.remote;
    return Object.keys(remote).map(name => withDefault(name, remote[name]));
}
exports.getRemoteList = getRemoteList;
function getExtensionSetting() {
    return host_1.getUserSetting();
}
exports.getExtensionSetting = getExtensionSetting;

function setBackPath(path) {
    backPath = path;
}
exports.setBackPath = setBackPath;
function getBackPath(path) {
    return backPath;
}
exports.getBackPath = getBackPath;
//# sourceMappingURL=config.js.map