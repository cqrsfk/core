'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const uuid = require('shortid');
const _ = require("lodash");
const updatedDataKey = Symbol();
class Event {
    constructor(actor, data, type, method, sagaId, direct = false, roleName) {
        this.data = data;
        this.type = type;
        this.method = method;
        this.sagaId = sagaId;
        this.direct = direct;
        this.roleName = roleName;
        this.index = 0;
        this[updatedDataKey] = null;
        this.id = uuid();
        this.actorId = actor.id;
        this.actorType = actor.type;
        this.date = new Date();
    }
    get json() {
        return Event.toJSON(this);
    }
    get updatedData() {
        return this[updatedDataKey];
    }
    set updatedData(v) {
        if (this[updatedDataKey])
            throw new Error("only set once.");
        this[updatedDataKey] = v;
    }
    static toJSON(event) {
        return JSON.parse(JSON.stringify(event));
    }
    static parse(data) {
        let event = _.cloneDeep(data);
        let updatedData = event.updatedData;
        delete event.updatedData;
        event[updatedDataKey] = updatedData;
        event.__proto__ = Event.prototype;
        return event;
    }
}
exports.default = Event;
//# sourceMappingURL=Event.js.map