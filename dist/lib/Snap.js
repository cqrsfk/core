"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuid = require("uuid").v1;
class Snap {
    constructor(actor, index = 0, latestEventIndex = 0) {
        this.index = index;
        this.latestEventIndex = latestEventIndex;
        this.id = uuid();
        this.date = new Date();
        this.actorId = actor.id;
        this.actorType = actor.type;
        this.data = actor.json;
    }
    get json() {
        let { id, latestEventIndex, date, actorId, actorType, data, index } = this;
        return { id, latestEventIndex, date, actorId, actorType, data, index };
    }
    static parse(data) {
        let snap = JSON.parse(JSON.stringify(data));
        snap.__proto__ = Snap.prototype;
        return snap;
    }
}
exports.default = Snap;
//# sourceMappingURL=Snap.js.map