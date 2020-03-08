"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function camelCase(str) {
    return str.replace(/[-_ ]([a-z])/g, token => token[1].toUpperCase());
}
exports.camelCase = camelCase;
//# sourceMappingURL=utlis.js.map