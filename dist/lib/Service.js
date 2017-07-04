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
    constructor(actor, bus, getActor, createActor, method, sagaId) {
        this.actor = actor;
        this.bus = bus;
        this.getActor = getActor;
        this.createActor = createActor;
        this.method = method;
        this.sagaId = sagaId;
        this.lockMode = false;
        this.sagaMode = false;
        this.key = uuid();
        this.applied = false;
    }
    apply(type, data, direct) {
        if (this.actor.json.isAlive) {
            const event = new Event_1.default(this.actor, data, type, this.method, this.sagaId, direct || false);
            this.actor[setdata] = Object.assign({}, this.actor.json, direct ? data : {}, this.actor[Symbol.for("when")](event) || {});
            this.actor[uncommittedEvents] = this.actor[uncommittedEvents] || [];
            this.actor[uncommittedEvents].push(event);
            this.bus.publish(this.actor);
        }
        this.applied = true;
    }
    lock(timeout) {
        this.lockMode = true;
        this.timeout = timeout;
    }
    unlock() {
        this.lockMode = false;
        // todo
    }
    sagaBegin() {
        if (this.sagaId && !this.sagaMode) {
            throw new Error("Cannot include child Saga");
        }
        this.sagaMode = true;
        this.sagaId = uuid();
    }
    sagaEnd() {
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
    actorLock(actor) {
        const that = this;
        return new Promise((resolve, reject) => {
            tryLock();
            async function tryLock() {
                var isLock = await actor.lock({ key: that.key, timeout: that.timeout });
                if (isLock)
                    resolve();
                else {
                    setTimeout(tryLock, 300);
                }
            }
        });
    }
    async get(type, id) {
        if (id === this.actor.id)
            throw new Error("Don't be get self");
        let proxy = await this.getActor(type, id, this.sagaId || null, this.key);
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
    once(event, handle, timeout) {
        this.bus.subscribe(event, { actorType: this.actor.type, actorId: this.actor.id, method: handle }, timeout);
    }
}
exports.default = Service;
//# sourceMappingURL=Service.js.map