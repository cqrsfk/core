"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
async function sleep(time) {
    return new Promise(resolve => setImmediate(() => setTimeout(resolve, time)));
}
exports.default = sleep;
//# sourceMappingURL=sleep.js.map