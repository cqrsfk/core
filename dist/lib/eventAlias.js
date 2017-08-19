"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Event_1 = require("./Event");
function getAlias(event) {
    if (event instanceof Event_1.default) {
        return [
            `${event.actorType}.${event.actorId}.${event.type}.${event.method}.${event.sagaId}`,
            `${event.actorType}.${event.actorId}.${event.type}.${event.method}.`,
            `${event.actorType}.${event.actorId}.${event.type}..`,
            `${event.actorType}.${event.actorId}...`,
            `${event.actorType}..${event.type}..`,
            `..${event.type}..`,
            `${event.actorType}....`,
            "...."
        ];
    }
    else {
        return `${event.actorType || ""}.${event.actorId || ""}.${event.type || ""}.${event.method || ""}.${event.sagaId || ""}`;
    }
}
exports.getAlias = getAlias;
//# sourceMappingURL=eventAlias.js.map