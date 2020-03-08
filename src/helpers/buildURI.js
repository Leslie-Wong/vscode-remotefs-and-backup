"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
function buildURI(scheme, name, path = '') {
    const removeLeadingSlash = path.replace(/^\/+/, '');
    return vscode.Uri.parse(`${scheme}://${name}/${removeLeadingSlash}`);
}
exports.default = buildURI;
//# sourceMappingURL=buildURI.js.map