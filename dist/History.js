"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
class History {
    constructor(protoActor, events) {
        this.protoActor = protoActor;
        this.events = events;
        this.index = 0;
        this.currentActor = lodash_1.cloneDeep(this.protoActor);
    }
    get() {
        return this.currentActor;
    }
    getIndex() {
        return this.index;
    }
    next() {
        if (this.index >= this.events.length) {
            return this.currentActor;
        }
        const events = this.events.slice(0, ++this.index);
        this.currentActor = lodash_1.cloneDeep(this.protoActor);
        events.forEach(e => this.currentActor.$updater(e));
        return this.currentActor;
    }
    getUndoneEvents(sagaId) {
        const events = this.events.filter(evt => evt.sagaId === sagaId);
        const recoverEventIds = [];
        for (let evt of this.events) {
            if (evt.recoverEventId) {
                recoverEventIds.push(evt.recoverEventId);
            }
        }
        return events.filter(evt => !recoverEventIds.includes(evt.sagaId));
    }
    prev() {
        if (this.index === 0) {
            return this.currentActor;
        }
        const events = this.events.slice(0, --this.index);
        this.currentActor = lodash_1.cloneDeep(this.protoActor);
        events.forEach(e => this.currentActor.$updater(e));
        return this.currentActor;
    }
    latest() {
        this.currentActor = lodash_1.cloneDeep(this.protoActor);
        this.events.forEach(e => this.currentActor.$updater(e));
        return this.currentActor;
    }
}
exports.History = History;
//# sourceMappingURL=History.js.map