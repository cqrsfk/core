"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Domain_1 = require("./Domain");
exports.Domain = Domain_1.default;
var Actor_1 = require("./Actor");
exports.Actor = Actor_1.default;
var Event_1 = require("./Event");
exports.Event = Event_1.default;
const Domain_2 = require("./Domain");
const cqrsVersionKey = Symbol.for("__cqrsVersionKey__");
if (global[cqrsVersionKey]) {
    throw new Error("Warning! The CQRS module must be single!");
}
global[cqrsVersionKey] = true;
// default domain instance.
exports.domain = new Domain_2.default();
//# sourceMappingURL=index.js.map