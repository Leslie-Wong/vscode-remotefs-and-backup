"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const constants_1 = require("./constants");
function showErrorMessage(message, ...args) {
    const errorStr = message instanceof Error ? message.message : message;
    return vscode.window.showErrorMessage(errorStr, ...args);
}
exports.showErrorMessage = showErrorMessage;
function getUserSetting() {
    return vscode.workspace.getConfiguration('remotefs');
}
exports.getUserSetting = getUserSetting;
function openWorkspace(uri, name) {
    return vscode.workspace.updateWorkspaceFolders(0, 1, { uri, name });
}
exports.openWorkspace = openWorkspace;
function addWorkspace(uri, name) {
    return vscode.workspace.updateWorkspaceFolders(0, 0, { uri, name });
}
exports.addWorkspace = addWorkspace;
function removeWorkspace(uri) {
    const { workspaceFolders, getWorkspaceFolder } = vscode.workspace;
    const workspaceFolder = getWorkspaceFolder(uri);
    // const index = workspaceFolders.findIndex(wf => {
    //   const wfUri = wf.uri;
    //   return (
    //     wfUri.scheme === uri.scheme && wfUri.authority === uri.authority && wfUri.path === uri.path
    //   );
    // });
    if (!workspaceFolder) {
        return;
    }
    return vscode.workspace.updateWorkspaceFolders(workspaceFolder.index, 1);
}
exports.removeWorkspace = removeWorkspace;
function promptForPassword(prompt) {
    return vscode.window.showInputBox({
        ignoreFocusOut: true,
        password: true,
        prompt: `${constants_1.EXTENSION_NAME}: ${prompt}`,
    });
}
exports.promptForPassword = promptForPassword;
//# sourceMappingURL=host.js.map