"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uncommittedEvents = Symbol.for('uncommittedEvents');
const uuid = require('uuid').v1;
exports.setdata = Symbol.for("setdata");
exports.datakey = Symbol("datakey");
exports.isLock = Symbol.for("isLock");
class Actor {
    constructor(data = {}) {
        this.lockData = { key: null, timeout: 2000, latestLockTime: new Date(), isLock: false };
        this[uncommittedEvents] = [];
        this[exports.datakey] = data;
        this[exports.datakey].isAlive = true;
        this[exports.datakey].listeners = {};
        if (!this[exports.datakey].id) {
            this[exports.datakey].id = uuid();
        }
    }
    get type() {
        return this.constructor.getType();
    }
    set [exports.setdata](data) {
        this[exports.datakey] = data;
    }
    get id() {
        return this.json.id;
    }
    static getType() {
        return this.name;
    }
    get json() {
        return this.constructor.toJSON(this);
    }
    get updater() {
        throw new Error("please implements updater() Getter!");
    }
    subscribe(event, listenerType, listenerId, handleMethodName) {
        this.$({ event, listenerType, listenerId, handleMethodName });
    }
    unsubscribe(event, listenerId) {
        this.$({ event, listenerId });
    }
    [exports.isLock](key) {
        if (this.lockData.key) {
            if (this.lockData.key === key) {
                return false;
            }
            else {
                return this.lockData.isLock && Date.now() - this.lockData.latestLockTime.getTime() < this.lockData.timeout;
            }
        }
        else {
            return false;
        }
    }
    remove() {
        this.$();
    }
    lock(data) {
        if (this.lockData.key === data.key) {
            return true;
        }
        if (this.lockData.isLock && Date.now() - this.lockData.latestLockTime.getTime() < this.lockData.timeout) {
            return false;
        }
        else {
            this.lockData.timeout = data.timeout || 200;
            this.lockData.key = data.key;
            this.lockData.isLock = true;
            this.lockData.latestLockTime = new Date();
            return true;
        }
    }
    // todo
    unlock(key) {
        if (this.lockData.key === key) {
            this.lockData.key = null;
        }
    }
    static toJSON(actor) {
        return JSON.parse(JSON.stringify(actor[exports.datakey]));
    }
    static parse(json) {
        return new this(json);
    }
}
exports.default = Actor;
//# sourceMappingURL=Actor.js.map