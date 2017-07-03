'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const uuid = require('uuid').v1;
const qs = require('querystring');
// type EventData = {
//     actorId: string
//     actorType: string
//     actorVersion: string
//     id: string
//     type: string
//     method: string
//     sagaId: string
//     date: Date
//     data: any
// }
class Event {
    constructor(actor, data, type, method, sagaId, direct = false) {
        this.data = data;
        this.type = type;
        this.method = method;
        this.sagaId = sagaId;
        this.direct = direct;
        this.index = 0;
        this.id = uuid();
        this.actorId = actor.id;
        this.actorType = actor.type;
        this.actorVersion = actor.version;
        this.date = new Date();
    }
    get json() {
        return Event.toJSON(this);
    }
    static toJSON(event) {
        return this._toJSON(event);
    }
    static _toJSON(data) {
        return JSON.parse(JSON.stringify(data));
    }
    static parse(data) {
        let event = this._toJSON(data);
        event.__proto__ = Event.prototype;
        return event;
    }
}
exports.default = Event;
//# sourceMappingURL=Event.js.map