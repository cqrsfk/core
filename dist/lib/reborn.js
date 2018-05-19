"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const loadEvents = Symbol.for('loadEvents');
exports.setdata = Symbol.for("setdata");
function reborm(ActorClass, snap, events, roleMap) {
    const actor = ActorClass.parse(snap.data);
    events.forEach(event => {
        let role = roleMap.get(event.roleName);
        let updater = actor.updater[event.type] ||
            actor.updater[event.method + "Update"] ||
            (role ? role.updater[event.type] || role.updater[event.method] : null);
        const updatedData = updater ? updater(actor.json, event) : {};
        actor[exports.setdata] = Object.assign({}, actor.json, updatedData);
    });
    return actor;
}
exports.default = reborm;
;
//# sourceMappingURL=reborn.js.map