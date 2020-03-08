"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const host_1 = require("../host");
const logger_1 = require("../logger");
function reportError(error) {
    logger_1.default.error(error);
    host_1.showErrorMessage(error);
}
exports.default = reportError;
//# sourceMappingURL=reportError.js.map