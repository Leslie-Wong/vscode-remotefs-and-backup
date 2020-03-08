"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const upath = require("upath");
function toAbsoluteUri(uri, base) {
    if (!base || uri.query.indexOf('absolute') !== -1) {
        return uri;
    }
    return uri.with({
        path: upath.join(base, uri.path.replace(/^\/+/, '')),
    });
}
exports.default = toAbsoluteUri;
//# sourceMappingURL=toAbsoluteUri.js.map