"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function getAlias(event) {
    return [
        `${event.actorType}.${event.actorId}.${event.type}`,
        `${event.actorType}..${event.type}`,
        `${event.actorType}.${event.actorId}.`,
        `${event.actorType}..`
    ];
}
exports.getAlias = getAlias;
//# sourceMappingURL=eventAlias.js.map