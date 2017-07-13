"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("mocha");
const DefaultIdManager_1 = require("../lib/DefaultIdManager");
try {
    new DefaultIdManager_1.default(3000);
    new DefaultIdManager_1.default(3000);
}
catch (err) {
    console.log("hhh");
}
//# sourceMappingURL=test.DefaultIdManager.js.map