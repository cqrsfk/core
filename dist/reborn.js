"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const loadEvents = Symbol.for('loadEvents');
exports.setdata = Symbol.for("setdata");
function reborm(ActorClass, snap, events) {
    const actor = ActorClass.parse(snap.data);
    actor[loadEvents](events);
    return actor;
}
exports.default = reborm;
;
//# sourceMappingURL=reborn.js.map