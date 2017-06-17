"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uncommittedEvents = Symbol.for('uncommittedEvents');
const loadEvents = Symbol.for('loadEvents');
const uuid = require('uuid').v1;
const setdata = Symbol.for("setdata");
const $when = Symbol.for("when");
class Actor {
    constructor(data = {}) {
        this[uncommittedEvents] = [];
        this.data = data;
        this.data.isAlive = true;
        if (!this.data.id) {
            this.data.id = uuid();
        }
    }
    get type() {
        return Actor.getType();
    }
    get version() {
        return Actor.version;
    }
    [loadEvents](events) {
        let data;
        events.forEach(event => {
            data = this.when(event);
            if (!data) {
                data = this.data;
            }
        });
    }
    set [setdata](data) {
        this.data = data;
    }
    remove(args) {
        this.service.apply('remove');
    }
    get id() {
        return this.json.id;
    }
    static getType() {
        return this.name;
    }
    get json() {
        let data = Actor.toJSON(this);
        Object.freeze(data);
        return data;
    }
    lock(data) {
        if (this.data.key === data.key) {
            return true;
        }
        if (this.data.isLock && Date.now() - this.latestLockTime.getTime() < this.data.timeout) {
            return false;
        }
        else {
            if (!data.timeout) {
                data.timeout = 2000;
            }
            this.service.apply("lock", data.key);
            this.latestLockTime = new Date();
            return true;
        }
    }
    unlock(key) {
        if (this.data.key === key) {
            this.service.apply("unlock", key);
        }
    }
    relock(key) {
        this.service.apply("unlock", key);
    }
    when(event) {
        switch (event.type) {
            case 'remove':
                return Object.assign({}, this.data, { isAlive: false });
            case 'lock':
                return Object.assign({}, this.data, { isLock: true, key: event.data.key, timeout: event.data.timeout });
            case 'unlock':
                return Object.assign({}, this.data, { isLock: false, key: event.data });
            default:
                return this.data;
        }
    }
    static toJSON(actor) {
        return JSON.parse(JSON.stringify(actor.data));
    }
    static parse(json) {
        return new Actor(json);
    }
    [$when](event) {
        return this.when(event);
    }
    static get version() {
        return "1.0";
    }
}
exports.Actor = Actor;
//# sourceMappingURL=Actor.js.map