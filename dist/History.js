"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
class History {
    constructor(protoActor, events) {
        this.protoActor = protoActor;
        this.events = events;
        this.index = 0;
        this.currentActor = lodash_1.cloneDeep(this.protoActor);
        events.forEach(e => this.currentActor.$updater(e));
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
        const events = this.events.slice(this.index, this.index + 1);
        events.forEach(e => this.currentActor.$updater(e));
    }
    prev() {
        if (this.index === 0) {
            return this.currentActor;
        }
        const events = this.events.slice(this.index - 1, this.index);
        events.forEach(e => this.currentActor.$updater(e));
    }
    latest() {
        this.currentActor = lodash_1.cloneDeep(this.protoActor);
        this.events.forEach(e => this.currentActor.$updater(e));
        return this.currentActor;
    }
}
exports.History = History;
//# sourceMappingURL=History.js.map