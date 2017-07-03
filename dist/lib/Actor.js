"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uncommittedEvents = Symbol.for('uncommittedEvents');
const loadEvents = Symbol.for('loadEvents');
const uuid = require('uuid').v1;
const setdata = Symbol.for("setdata");
const $when = Symbol.for("when");
const isLock = Symbol.for("isLock");
class Actor {
    constructor(data = {}) {
        this.lockData = { key: null, timeout: 2000, latestLockTime: new Date(), isLock: false };
        this.tags = new Set();
        this[uncommittedEvents] = [];
        this.data = data;
        this.data.isAlive = true;
        if (!this.data.id) {
            this.data.id = uuid();
        }
    }
    get type() {
        return this.constructor["getType"]();
    }
    get version() {
        return this.constructor["version"];
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
    [isLock](key) {
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
    when(event) {
        switch (event.type) {
            case 'remove':
                return { isAlive: false };
        }
    }
    static toJSON(actor) {
        return JSON.parse(JSON.stringify(actor.data));
    }
    static parse(json) {
        return new this(json);
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