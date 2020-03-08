'use strict';
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const upath = require("upath");
const constants_1 = require("./constants");
const config_1 = require("./core/config");
const buildURI_1 = require("./helpers/buildURI");
const host_1 = require("./host");
const SFTPFSProvider_1 = require("./fs-providers/SFTPFSProvider");
const FTPProvider_1 = require("./fs-providers/FTPProvider");
const providerManager_1 = require("./core/providerManager");
const DEFAULT_ROOTLABEL = '${folderName} — (Remote)';
function supplant(string, props) {
    let result = string.replace(/\${([^{}]*)}/g, (match, expr) => {
        const value = props[expr];
        return typeof value === 'string' || typeof value === 'number' ? value : match;
    });
    result = result.replace(/"{#([^{}]*)}"/g, (match, expr) => {
        const value = props[expr];
        return typeof value === 'string' || typeof value === 'number' ? value : match;
    });
    return result;
}
function registerCommand(context, name, callback, thisArg) {
    const disposable = vscode.commands.registerCommand(name, callback, thisArg);
    context.subscriptions.push(disposable);
}
function getRemote() {
    const remotes = config_1.getRemoteList();
    return vscode.window
        .showQuickPick(remotes.map(remote => {
        let description = `${remote.host}:${remote.port}`;
        if (remote.rootPath) {
            description += ` at ${remote.rootPath}`;
        }
        return {
            label: remote.name,
            description,
            remote,
        };
    }), {
        placeHolder: 'Please choose a remote',
    })
        .then(selection => {
        if (!selection) {
            return;
        }
        return selection.remote;
    });
}
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {
    context.subscriptions.push(vscode.workspace.registerFileSystemProvider('sftp', providerManager_1.default.instance(SFTPFSProvider_1.default), {
        isCaseSensitive: true,
    }));
    context.subscriptions.push(vscode.workspace.registerFileSystemProvider('ftp', providerManager_1.default.instance(FTPProvider_1.default), {
        isCaseSensitive: true,
    }));
    registerCommand(context, constants_1.COMMAND_ADD_FOLDER_TO_WORKSPACE, () => __awaiter(this, void 0, void 0, function* () {
        const extConfig = config_1.getExtensionSetting();
        const remote = yield getRemote();
        if (!remote) {
            return;
        }
        const rootLabel = extConfig.get('rootLabel', DEFAULT_ROOTLABEL);
        const folderName = (remote.rootPath && upath.basename(remote.rootPath)) || '/';
        const label = supplant(rootLabel, { name: remote.name, folderName });
        if(remote.backPath)
            config_1.setBackPath(remote.backPath);
    host_1.addWorkspace(buildURI_1.default(remote.scheme, remote.name), label);
    }));
}
exports.activate = activate;
function deactivate() {
    for (const fsProvider of providerManager_1.default.fses()) {
        fsProvider.destroy();
    }
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map