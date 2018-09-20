"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const Event_1 = require("./Event");
const datakey = Symbol.for("datakey");
const _ = require("lodash");
const uuid = require("shortid");
const uncommittedEvents = Symbol.for("uncommittedEvents");
const setdata = Symbol.for("setdata");
exports.latestEventIndex = Symbol.for("latestEventIndex");
/**
 * When call actor's method , then DI service object.
 */
class Service {
    constructor(actor, bus, repo, _domain, getActor, createActor, method, sagaId, roleName, role, parents) {
        this.actor = actor;
        this.bus = bus;
        this.repo = repo;
        this._domain = _domain;
        this.getActor = getActor;
        this.createActor = createActor;
        this.method = method;
        this.sagaId = sagaId;
        this.roleName = roleName;
        this.role = role;
        this.parents = parents;
        this.lockMode = false;
        this.sagaMode = false;
        this.key = uuid();
        this.subIds = [];
        this.applied = false;
        this.unbindCalled = false;
    }
    get isRootSaga() {
        return this.sagaMode;
    }
    apply(type, data, direct) {
        return __awaiter(this, void 0, void 0, function* () {
            const event = new Event_1.default(this.actor, data, type, this.method, this.sagaId, direct || false, this.roleName);
            let updater;
            if (type === "remove") {
                updater = () => ({ isAlive: false });
            }
            else if (type === "subscribe") {
                updater = (json, _event) => {
                    const listeners = json.listeners;
                    let { event, listenerType, listenerId, handleMethodName } = _event.data;
                    if (listeners[event]) {
                        listeners[event][listenerId] = { handleMethodName, listenerType };
                    }
                    else {
                        listeners[event] = { [listenerId]: { handleMethodName, listenerType } };
                    }
                    return { listeners };
                };
            }
            else if (type === "unsubscribe") {
                updater = (json, _event) => {
                    const listeners = json.listeners;
                    let { event, listenerId } = _event.data;
                    if (listeners[event]) {
                        delete listeners[event][listenerId];
                    }
                    return { listeners };
                };
            }
            else {
                updater = (this.actor.updater[type] ||
                    this.actor.updater[this.method + "Update"] ||
                    (this.role ? this.role.updater[type] || this.role.updater[this.method] : null));
            }
            if (updater) {
                const updatedData = updater(this.actor[datakey], event);
                this.actor[datakey] = Object.assign({}, this.actor[datakey], direct ? data : {}, updatedData);
                event.updatedData = _.pick(this.actor.refreshJSON(), Object.keys(updatedData));
            }
            this.actor[uncommittedEvents] = this.actor[uncommittedEvents] || [];
            this.actor[uncommittedEvents].push(event);
            ++this.actor[exports.latestEventIndex];
            // this.actor.refreshJSON();
            yield this.bus.publish(this.actor);
            this.applied = true;
            if (!["subscribe", "unsubscribe", "_subscribe", "_unsubscribe"].includes(type)) {
                const actorType = this.actor.type;
                setImmediate(() => __awaiter(this, void 0, void 0, function* () {
                    const emitter = yield this.get("ActorEventEmitter", "ActorEventEmitter" + actorType);
                    if (emitter) {
                        emitter.publish(event);
                    }
                }));
                let listeners = this.actor.json.listeners;
                let handles = listeners[type];
                let emit = (handles) => __awaiter(this, void 0, void 0, function* () {
                    if (handles) {
                        for (let id in handles) {
                            let { handleMethodName, listenerType } = handles[id];
                            let actor = yield this.get(listenerType, id);
                            if (actor) {
                                actor[handleMethodName](event);
                            }
                        }
                    }
                });
                emit(handles);
                handles = listeners["*"];
                emit(handles);
            }
            this.unbind();
        });
    }
    lock(timeout) {
        this.lockMode = true;
        this.timeout = timeout;
    }
    unlock() {
        this.lockMode = false;
        // todo
    }
    unbind() {
        this.unbindCalled = true;
        this._domain.unbind(this.actor.id);
        this.subIds.forEach(id => this._domain.unbind(id));
    }
    sagaBegin() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.sagaId && !this.sagaMode) {
                throw new Error("Cannot include child Saga");
            }
            this.sagaMode = true;
            this.sagaId = uuid();
            yield this._domain.eventstore.beginSaga(this.sagaId);
        });
    }
    sagaEnd() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.sagaMode) {
                this.sagaMode = false;
                this.sagaId = null;
                yield this._domain.eventstore.endSaga(this.sagaId);
            }
        });
    }
    rollback() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.sagaMode) {
                return yield this.bus.rollback(this.sagaId);
            }
            else {
                throw new Error("no saga");
            }
        });
    }
    actorLock(actor) {
        const that = this;
        return new Promise((resolve, reject) => {
            tryLock();
            function tryLock() {
                return __awaiter(this, void 0, void 0, function* () {
                    var isLock = yield actor.lock({ key: that.key, timeout: that.timeout });
                    if (isLock)
                        resolve();
                    else {
                        setTimeout(tryLock, 300);
                    }
                });
            }
        });
    }
    get(type, id) {
        return __awaiter(this, void 0, void 0, function* () {
            if (id === this.actor.id)
                throw new Error("Don't be get self");
            this.subIds.push(id);
            let proxy = yield this.getActor(type, id, this.sagaId || null, this.key, this.parents || []);
            if (!proxy)
                return null;
            if (this.lockMode) {
                yield this.actorLock(proxy);
            }
            return proxy;
        });
    }
    create(type, data) {
        return __awaiter(this, arguments, void 0, function* () {
            return this.createActor(...arguments, this.sagaId);
        });
    }
    subscribe(event, handleMethodName) {
        return __awaiter(this, void 0, void 0, function* () {
            let { actorId, actorType, type } = event;
            if (actorId && actorType && type) {
                let actor = yield this.get(actorType, actorId);
                if (actor) {
                    actor.subscribe(type, this.actor.type, this.actor.id, handleMethodName);
                }
            }
            else if (actorType) {
                let actor = yield this.get("ActorEventEmitter", "ActorEventEmitter" + actorType);
                if (actor) {
                    yield actor.subscribe(actorType, this.actor.type, this.actor.id, handleMethodName);
                }
            }
        });
    }
    unsubscribe(event) {
        return __awaiter(this, void 0, void 0, function* () {
            let { actorId, actorType, type } = event;
            if (actorId && actorType && type) {
                let actor = yield this.get(actorType, actorId);
                if (actor) {
                    actor.unsubscribe(type, this.actor.id);
                }
            }
            else if (actorType) {
                let actor = yield this.get("ActorEventEmitter", "ActorEventEmitter" + actorType);
                if (actor) {
                    yield actor.unsubscribe(actorType, this.actor.id);
                }
            }
        });
    }
    getHistory(actorType, actorId, eventType) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this._domain.getHistory(actorType, actorId, eventType);
        });
    }
}
exports.default = Service;
//# sourceMappingURL=Service.js.map