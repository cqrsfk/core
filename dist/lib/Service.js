"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Event_1 = require("./Event");
const uuid = require("uuid").v1;
const uncommittedEvents = Symbol.for("uncommittedEvents");
const setdata = Symbol.for("setdata");
/**
 * When call actor's method , then DI service object.
 */
class Service {
    constructor(actor, // proxy
        bus, getActor, createActor, method, sagaId) {
        this.actor = actor;
        this.bus = bus;
        this.getActor = getActor;
        this.createActor = createActor;
        this.method = method;
        this.sagaId = sagaId;
        this.lockMode = false;
        this.sagaMode = false;
        this.key = uuid();
    }
    async apply(type, data) {
        if (this.actor.json.isAlive) {
            const event = new Event_1.default(this.actor, data, type, this.method, this.sagaId);
            this.actor[setdata] = this.actor[Symbol.for("when")](event) || this.actor.json;
            this.actor[uncommittedEvents] = this.actor[uncommittedEvents] || [];
            this.actor[uncommittedEvents].push(event);
            await this.bus.publish(this.actor);
        }
    }
    lock() {
        this.lockMode = true;
    }
    unlock() {
        this.lockMode = false;
    }
    async sagaBegin() {
        if (this.sagaId && !this.sagaMode) {
            throw new Error("Cannot include child Saga");
        }
        this.sagaMode = true;
        this.sagaId = uuid();
    }
    async sagaEnd() {
        if (this.sagaMode) {
            this.sagaMode = false;
            this.sagaId = null;
        }
    }
    async rollback() {
        if (this.sagaMode) {
            return await this.bus.rollback(this.sagaId);
        }
        else {
            throw new Error("no saga");
        }
    }
    actorLock(actor, timeout) {
        const that = this;
        return new Promise((resolve, reject) => {
            // try lock actor
            tryLock();
            async function tryLock() {
                try {
                    var isLock = await actor.lock({ key: that.key });
                }
                catch (e) {
                    console.log(e);
                }
                if (isLock)
                    resolve();
                else {
                    setTimeout(tryLock, timeout || 300);
                }
            }
        });
    }
    async get(type, id) {
        if (id === this.actor.id)
            throw new Error("Don't be get self");
        let proxy = await this.getActor(type, id, this.sagaId, this.key);
        if (!proxy)
            return null;
        if (this.lockMode) {
            await this.actorLock(proxy);
        }
        return proxy;
    }
    async create(type, data) {
        return this.createActor(...arguments, this.sagaId);
    }
    once(event, hande, timeout) {
    }
    on(event, handle, timeout) {
    }
}
exports.default = Service;
//# sourceMappingURL=Service.js.map