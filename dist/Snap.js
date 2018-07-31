"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuid = require("shortid");
const _ = require("lodash");
class Snap {
    constructor(actor, index = 0, latestEventIndex = -1) {
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
        let snap = _.cloneDeep(data);
        snap.__proto__ = Snap.prototype;
        return snap;
    }
}
exports.default = Snap;
//# sourceMappingURL=Snap.js.map