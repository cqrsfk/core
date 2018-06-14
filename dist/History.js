"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const reborn_1 = require("./reborn");
const _ = require("lodash");
class History {
    constructor(ActorClass, lastSnap, events, eventType) {
        this.ActorClass = ActorClass;
        this.lastSnap = lastSnap;
        this.events = events;
        this.eventType = eventType;
        this.index = events.length - 1;
    }
    validateIndex(index) {
        return index >= -1 && index < this.events.length;
    }
    get(index) {
        if (index === undefined) {
            index = this.index;
        }
        if (this.validateIndex(index)) {
            if (index !== -1 && this.eventType) {
                let _index = _.findLastIndex(this.events.slice(0, index + 1), { type: this.eventType });
                if (_index === -1) {
                    return null;
                }
                else {
                    index = _index;
                }
            }
            let events = this.events.slice(0, index + 1);
            this.index = index;
            return reborn_1.default(this.ActorClass, this.lastSnap, events).json;
        }
        else {
            return null;
        }
    }
    next() {
        return this.get(1 + this.index);
    }
    prev() {
        return this.get(this.index - 1);
    }
}
exports.default = History;
//# sourceMappingURL=History.js.map