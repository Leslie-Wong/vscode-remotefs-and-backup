"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const manager = {
    activeRemoteFSSet: new Set(),
};
exports.default = {
    instance(fsClass) {
        const fs = new fsClass();
        manager.activeRemoteFSSet.add(fs);
        return fs;
    },
    fses() {
        return manager.activeRemoteFSSet.values();
    },
};
//# sourceMappingURL=providerManager.js.map