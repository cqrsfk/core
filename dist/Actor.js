"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uncommittedEvents = Symbol.for('uncommittedEvents');
const uuid = require('shortid');
const setdata = Symbol.for("setdata");
const datakey = Symbol.for("datakey");
const cloneDataKey = Symbol("cloneDataKey");
const isLock = Symbol.for("isLock");
const loadEvents = Symbol.for("loadEvents");
const roleMap = Symbol.for("roleMap");
const latestEventIndex = Symbol.for("latestEventIndex");
const jsonKey = Symbol("json");
const _ = require("lodash");
class Actor {
    constructor(data = {}) {
        this.lockData = { key: null, timeout: 2000, latestLockTime: new Date(), isLock: false };
        this[uncommittedEvents] = [];
        this[datakey] = data;
        this[datakey].isAlive = true;
        this[datakey].listeners = {};
        if (!this[datakey].id) {
            this[datakey].id = uuid();
        }
        this[latestEventIndex] = -1;
        this.refreshJSON();
    }
    get data() {
        return this[cloneDataKey];
    }
    refreshJSON() {
        return this[jsonKey] = this.constructor.toJSON(this);
    }
    refreshData() {
        return Actor.toJSON(this);
    }
    get type() {
        return this.constructor.getType();
    }
    set [setdata](data) {
        this[datakey] = data;
    }
    get id() {
        return this.json.id;
    }
    static getType() {
        return this.name;
    }
    get json() {
        return this[jsonKey];
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
    [loadEvents](events) {
        events.forEach(event => {
            let role = this.constructor[roleMap].get(event.roleName);
            let updater = this.updater[event.type] ||
                this.updater[event.method + "Update"] ||
                (role ? role.updater[event.type] || role.updater[event.method] : null);
            const updatedData = updater ? updater(Actor.toJSON(this), event) : {};
            this[setdata] = Object.assign({}, Actor.toJSON(this), updatedData);
            this[latestEventIndex] = event.index;
        });
    }
    // todo
    unlock(key) {
        if (this.lockData.key === key) {
            this.lockData.key = null;
        }
    }
    static toJSON(actor) {
        return actor[cloneDataKey] = _.cloneDeep(actor[datakey]);
    }
    static parse(json) {
        let act = new Actor();
        if (this.toParse) {
            json = this.toParse(json);
        }
        act[datakey] = json;
        act.__proto__ = this.prototype;
        return act;
    }
    unbind() {
        this.service.unbind();
    }
}
exports.default = Actor;
//# sourceMappingURL=Actor.js.map