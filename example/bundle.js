(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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
            this.lockData.timeout = data.timeout || 2000;
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

},{"uuid":46}],2:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Event_1 = require("./Event");
const events_1 = require("events");
const nedb = require("nedb-promise");
const Snap_1 = require("./Snap");
class DefaultEventStore extends events_1.EventEmitter {
    constructor() {
        super();
        this.events = nedb();
        this.snaps = nedb();
        this.sagas = nedb();
    }
    async existSaga(sagaId) {
        return !!await this.getSaga(sagaId);
    }
    async beginSaga(sagaId) {
        const exist = await this.existSaga(sagaId);
        if (!exist) {
            return this.sagas.insert({ sagaId, done: false, alive: true });
        }
    }
    async getSaga(sagaId) {
        return await this.sagas.cfindOne({ sagaId, alive: true }).exec();
    }
    async killSaga(sagaId) {
        return await this.sagas.update({ sagaId }, { alive: false });
    }
    async endSaga(sagaId) {
        const exist = await this.existSaga(sagaId);
        if (exist) {
            return await this.sagas.update({ sagaId }, { done: true });
        }
    }
    async findUndoneSaga() {
        return await this.sagas.find({ done: false });
    }
    async createSnap(snap) {
        return await this.snaps.insert(snap.json);
    }
    async saveEvents(events) {
        events = [].concat(events);
        const eventsJSONArr = events.map(event => {
            return event.json || event;
        });
        await this.events.insert(eventsJSONArr);
        this.emit('saved events', events);
    }
    async getLatestSnapshot(actorId) {
        let data = await this.snaps.cfindOne({ actorId }).sort({ index: -1, date: -1 }).exec();
        if (data) {
            return Snap_1.default.parse(data);
        }
    }
    async getEvents(actorId) {
        let events = await this.events.cfind({ actorId }).sort({ index: -1, date: -1 }).exec();
        return events.map(event => Event_1.default.parse(event));
    }
    async getLatestEvent(actorId) {
        let event = await this.events.cfind({ actorId }).sort({ index: -1, date: -1 }).limit(1).exec();
        return event.length ? Event_1.default.parse(event[0]) : null;
    }
    async getEventsBySnapshot(snapId) {
        const snap = await this.getSnapshotById(snapId);
        if (snap) {
            if (snap) {
                let events = await this.events.cfind({
                    actorId: snap.actorId,
                    index: { '$gt': snap.latestEventIndex }
                }).sort({ date: 1, index: 1 }).exec();
                return events.map(event => Event_1.default.parse(event));
            }
        }
    }
    async getSnapshotByIndex(actorId, index) {
        let snap = await this.snaps.cfindOne({ actorId, index }).exec();
        return Snap_1.default.parse(snap);
    }
    async getSnapshotByLastIndex(actorId, index) {
        let snap = await this.getLatestSnapshot(actorId);
        if (snap) {
            if (index === 0) {
                return snap;
            }
            else {
                return await this.getSnapshotByIndex(actorId, snap.index - index);
            }
        }
    }
    async getSnapshotById(id) {
        let snap = await this.snaps.cfindOne({ id }).exec();
        return Snap_1.default.parse(snap);
    }
    async getEventById(id) {
        let event = await this.events.cfindOne({ id }).exec();
        if (event) {
            return Event_1.default.parse(event);
        }
        else {
            return null;
        }
    }
    async findEventsBySagaId(sagaId) {
        let events = await this.events.cfind({ sagaId }).sort({ index: -1, date: -1 }).exec();
        return events.map(event => Event_1.default.parse(event));
    }
    async removeEventsBySagaId(sagaId) {
        await this.killSaga(sagaId);
        await this.events.remove({ sagaId });
    }
}
exports.default = DefaultEventStore;

},{"./Event":4,"./Snap":8,"events":23,"nedb-promise":25}],3:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Service_1 = require("./Service");
const Repository_1 = require("./Repository");
const DefaultEventStore_1 = require("./DefaultEventStore");
const EventBus_1 = require("./EventBus");
const isLock = Symbol.for("isLock");
class Domain {
    constructor(options = {}) {
        this.eventstore = options.EventStore ? new options.EventStore : new DefaultEventStore_1.default();
        this.ActorClassMap = new Map();
        this.repositorieMap = new Map();
        this.eventbus = options.EventBus ?
            new options.EventBus(this.eventstore, this, this.repositorieMap, this.ActorClassMap) :
            new EventBus_1.default(this.eventstore, this, this.repositorieMap, this.ActorClassMap);
    }
    async getNativeActor(type, id) {
        let repo = this.repositorieMap.get(this.ActorClassMap.get(type));
        return await repo.get(id);
    }
    async nativeCreateActor(type, data) {
        const ActorClass = this.ActorClassMap.get(type);
        const repo = this.repositorieMap.get(ActorClass);
        if (ActorClass.createBefor) {
            try {
                data = (await ActorClass.createBefor(data, this)) || data;
            }
            catch (err) {
                throw err;
            }
        }
        const actorId = (await repo.create(data)).json.id;
        return await this.getActorProxy(type, actorId);
    }
    async getActorProxy(type, id, sagaId, key) {
        const that = this;
        const actor = await this.getNativeActor(type, id);
        const proxy = new Proxy(actor, {
            get(target, prop) {
                if (prop === "then") {
                    return proxy;
                }
                ;
                const member = actor[prop];
                if ("lock" === prop) {
                    return Reflect.get(target, prop);
                }
                if (typeof member === "function") {
                    return new Proxy(member, {
                        apply(target, cxt, args) {
                            return new Promise(function (resolve, reject) {
                                function run() {
                                    const islock = actor[isLock](key);
                                    if (islock) {
                                        setTimeout(run, 2000);
                                    }
                                    else {
                                        const iservice = new Service_1.default(actor, that.eventbus, (type, id, sagaId, key) => that.getActorProxy(type, id, sagaId, key), (type, data) => that.nativeCreateActor(type, id), prop, sagaId);
                                        const service = new Proxy(function service(type, data) {
                                            if (arguments.length === 0) {
                                                type = prop;
                                                data = null;
                                            }
                                            else if (arguments.length === 1) {
                                                data = type;
                                                type = prop;
                                            }
                                            return iservice.apply(type, data);
                                        }, {
                                            get(target, prop) {
                                                return iservice[prop].bind(iservice);
                                            }
                                        });
                                        cxt = { service, $: service };
                                        cxt.__proto__ = proxy;
                                        let result;
                                        try {
                                            result = target.call(cxt, ...args);
                                        }
                                        catch (err) {
                                            that.eventbus.rollback(sagaId || iservice.sagaId).then(r => reject(err));
                                        }
                                        if (result instanceof Promise) {
                                            result
                                                .then(result => {
                                                if (!iservice.applied) {
                                                    iservice.apply(prop, {});
                                                }
                                                resolve(result);
                                            }).catch(err => {
                                                that.eventbus.rollback(sagaId || iservice.sagaId).then(r => reject(err));
                                            });
                                        }
                                        else {
                                            if (!iservice.applied) {
                                                iservice.apply(prop, {});
                                            }
                                            resolve(result);
                                        }
                                    }
                                }
                                run();
                            });
                        }
                    });
                }
                else if (prop === "json") {
                    return member;
                }
                else {
                    if (actor.tags.has(prop)) {
                        const service = new Service_1.default(actor, that.eventbus, (type, id, sagaId, key) => that.getActorProxy(type, id, sagaId, key), (type, data) => that.nativeCreateActor(type, id), prop, sagaId);
                        service.apply(prop);
                    }
                    else {
                        return (actor.json)[prop] || actor[prop];
                    }
                }
            }
        });
        return proxy;
    }
    register(Classes) {
        if (!Array.isArray(Classes)) {
            Classes = [Classes];
        }
        for (let Class of Classes) {
            this.ActorClassMap.set(Class.getType(), Class);
            this.repositorieMap.set(Class, new Repository_1.default(Class, this.eventstore));
        }
        return this;
    }
    async create(type, data) {
        return await this.nativeCreateActor(type, data);
    }
    async get(type, id) {
        return await this.getActorProxy(type, id);
    }
    on(event, handle) {
        this.eventbus.on(event, handle);
    }
    once(event, handle) {
        this.eventbus.on(event, handle);
    }
}
exports.default = Domain;

},{"./DefaultEventStore":2,"./EventBus":5,"./Repository":6,"./Service":7}],4:[function(require,module,exports){
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const uuid = require('uuid').v1;
const qs = require('querystring');
// type EventData = {
//     actorId: string
//     actorType: string
//     actorVersion: string
//     id: string
//     type: string
//     method: string
//     sagaId: string
//     date: Date
//     data: any
// }
class Event {
    constructor(actor, data, type, method, sagaId, direct = false) {
        this.data = data;
        this.type = type;
        this.method = method;
        this.sagaId = sagaId;
        this.direct = direct;
        this.index = 0;
        this.id = uuid();
        this.actorId = actor.id;
        this.actorType = actor.type;
        this.actorVersion = actor.version;
        this.date = new Date();
    }
    get json() {
        return Event.toJSON(this);
    }
    static toJSON(event) {
        return this._toJSON(event);
    }
    static _toJSON(data) {
        return JSON.parse(JSON.stringify(data));
    }
    static parse(data) {
        let event = this._toJSON(data);
        event.__proto__ = Event.prototype;
        return event;
    }
}
exports.default = Event;

},{"querystring":40,"uuid":46}],5:[function(require,module,exports){
(function (process){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const eventAlias_1 = require("./eventAlias");
const Snap_1 = require("./Snap");
const uncommittedEvents = Symbol.for("uncommittedEvents");
class EventBus {
    constructor(eventstore, domain, repositorieMap, ActorClassMap) {
        this.eventstore = eventstore;
        this.domain = domain;
        this.repositorieMap = repositorieMap;
        this.ActorClassMap = ActorClassMap;
        this.emitter = new events_1.EventEmitter();
        this.lockSet = new Set();
        this.subscribeRepo = new Map();
        this.eventstore.on("saved events", events => {
            for (let event of events) {
                const alias = eventAlias_1.getAlias(event);
                for (let name of alias) {
                    process.nextTick(() => {
                        this.emitter.emit(name, event);
                        const s = this.subscribeRepo.get(name);
                        if (s) {
                            for (let handle of s) {
                                this.domain.get(handle.actorType, handle.actorId).then(actor => {
                                    actor[handle.method](event);
                                });
                            }
                        }
                        this.subscribeRepo.delete(name);
                    });
                }
            }
        });
    }
    once(event, cb) {
        return new Promise((resolve, reject) => {
            this.emitter.once(eventAlias_1.getAlias(event), function (event) {
                resolve(event);
                if (cb) {
                    setImmediate(() => cb(event));
                }
            });
        });
    }
    subscribe(event, { actorType, actorId, method }, timeout) {
        let eventname = eventAlias_1.getAlias(event);
        let repo = this.subscribeRepo.get(eventname);
        if (!repo) {
            repo = new Set();
            this.subscribeRepo.set(eventname, repo);
        }
        repo.add({ actorType, actorId, method });
    }
    unsubscribe() {
        // this.subscribeRepo.delete(getAlias(event));
    }
    on(event, cb) {
        this.emitter.on(eventAlias_1.getAlias(event), function (event) {
            cb(event);
        });
    }
    async publish(actor) {
        if (this.lockSet.has(actor.id)) {
            return;
        }
        else {
            this.lockSet.add(actor.id);
        }
        const event = await this.eventstore.getLatestEvent(actor.id);
        let startIndex = event ? event.index + 1 : 0;
        let events = actor[uncommittedEvents].map(function (evt, index) {
            evt.index = index + startIndex;
            return evt;
        });
        await this.eventstore.saveEvents(events);
        actor[uncommittedEvents] = [];
        let snap = await this.eventstore.getLatestSnapshot(actor.id);
        let lastEvent = events[events.length - 1];
        if (lastEvent.index - snap.lastEventId > 10) {
            let latestEventIndex = lastEvent.index;
            let index = snap.index + 1;
            let newSnap = new Snap_1.default(actor, index, latestEventIndex);
            await this.eventstore.createSnap(newSnap);
        }
        this.lockSet.delete(actor.id);
        if (actor[uncommittedEvents].length) {
            await this.publish(actor);
        }
    }
    async rollback(sagaId) {
        await this.eventstore.killSaga(sagaId);
        const events = await this.eventstore.findEventsBySagaId(sagaId);
        await this.eventstore.removeEventsBySagaId(sagaId);
        events.forEach(event => {
            const Class = this.ActorClassMap.get(event.actorType);
            const repo = this.repositorieMap.get(Class);
            repo.clear(event.actorId);
        });
    }
}
exports.default = EventBus;

}).call(this,require('_process'))
},{"./Snap":8,"./eventAlias":9,"_process":37,"events":23}],6:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Snap_1 = require("./Snap");
const reborn_1 = require("./reborn");
class Repository {
    constructor(ActorClass, eventstore) {
        this.ActorClass = ActorClass;
        this.eventstore = eventstore;
        this.cache = new Map();
    }
    async create(data) {
        const actor = new this.ActorClass(data);
        const snap = new Snap_1.default(actor);
        await this.eventstore.createSnap(snap);
        this.cache.set(actor.id, actor);
        return actor;
    }
    clear(id) {
        this.cache.delete(id);
    }
    getFromCache(id) {
        return this.cache.get(id);
    }
    async get(id) {
        let actor = this.getFromCache(id);
        if (actor) {
            return actor;
        }
        else {
            const snap = await this.eventstore.getLatestSnapshot(id);
            if (snap) {
                const events = await this.eventstore.getEventsBySnapshot(snap.id);
                const actor = reborn_1.default(this.ActorClass, snap, events);
                return actor;
            }
        }
    }
    exist(id) {
        return this.cache.has(id);
    }
}
exports.default = Repository;

},{"./Snap":8,"./reborn":11}],7:[function(require,module,exports){
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
    async apply(type, data, direct) {
        if (this.actor.json.isAlive) {
            const event = new Event_1.default(this.actor, data, type, this.method, this.sagaId, direct || false);
            this.actor[setdata] = Object.assign({}, this.actor.json, direct ? data : {}, this.actor[Symbol.for("when")](event) || {});
            this.actor[uncommittedEvents] = this.actor[uncommittedEvents] || [];
            this.actor[uncommittedEvents].push(event);
            await this.bus.publish(this.actor);
        }
        this.applied = true;
    }
    lock(timeout) {
        this.lockMode = true;
        this.timeout = timeout;
    }
    unlock() {
        this.lockMode = false;
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

},{"./Event":4,"uuid":46}],8:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuid = require("uuid").v1;
class Snap {
    constructor(actor, index = 0, latestEventIndex = 0) {
        this.index = index;
        this.latestEventIndex = latestEventIndex;
        this.id = uuid();
        this.date = new Date();
        this.actorId = actor.id;
        this.actorType = actor.type;
        this.actorVersion = actor.version;
        this.data = actor.json;
    }
    get json() {
        let { id, latestEventIndex, date, actorId, actorType, data, index } = this;
        return { id, latestEventIndex, date, actorId, actorType, data, index };
    }
    static parse(data) {
        let snap = JSON.parse(JSON.stringify(data));
        snap.__proto__ = Snap.prototype;
        return snap;
    }
}
exports.default = Snap;

},{"uuid":46}],9:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Event_1 = require("./Event");
function getAlias(event) {
    if (event instanceof Event_1.default) {
        return [
            `${event.actorType}.${event.actorId}.${event.type}.${event.method}.${event.sagaId}`,
            `${event.actorType}.${event.actorId}.${event.type}.${event.method}.`,
            `${event.actorType}.${event.actorId}.${event.type}..`,
            `${event.actorType}.${event.actorId}...`,
            `${event.actorType}..${event.type}..`,
            `${event.actorType}....`
        ];
    }
    else {
        return `${event.actorType || ""}.${event.actorId || ""}.${event.type || ""}.${event.method || ""}.${event.sagaId || ""}`;
    }
}
exports.getAlias = getAlias;

},{"./Event":4}],10:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Domain_1 = require("./Domain");
exports.Domain = Domain_1.default;
const Actor_1 = require("./Actor");
exports.Actor = Actor_1.Actor;
// default domain instance.
const domain = new Domain_1.default();
exports.domain = domain;

},{"./Actor":1,"./Domain":3}],11:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const loadEvents = Symbol.for('loadEvents');
function reborm(ActorClass, snap, events) {
    const actor = ActorClass.parse(snap.data);
    actor[loadEvents](events);
    return actor;
}
exports.default = reborm;
;

},{}],12:[function(require,module,exports){
const { Actor } = require("..");

module.exports = class Transfer extends Actor {

    constructor(data) {
        super({ finish: false });
    }

    log(event) {
        console.log(event);
    }

    async transfe(fromUserId, toUserId, money) {
        const $ = this.$;
        $.sagaBegin();
        $.lock();
        $.once({ actorType: "User", type: "add" }, "log");
        const fromUser = await $.get("User", fromUserId);
        const toUser = await $.get("User", toUserId);

        fromUser.deduct(money);
        toUser.add(money);

        if (money > 100)
            throw new Error("hhhh")

        $.unlock();
        $.sagaEnd();

        $("finish", null);
    }

    when(event) {
        switch (event.type) {
            case "finish":
                return { finish: true }
        }
    }


}
},{"..":10}],13:[function(require,module,exports){
const { Actor } = require("..");

module.exports = class User extends Actor {

    constructor(data) {
        super({ money: data.money || 0, name: data.name });
    }

    changename(name) {
        this.$(name);
    }

    deduct(money) {
        this.$("deduct", money);
    }

    add(money) {
        this.service.apply("add", money);
    }

    when(event) {
        const data = this.json;
        switch (event.type) {
            case "changename":
                return { name: event.name }
            case "deduct":
                return { money: data.money - event.data }
            case "add":
                return { money: data.money + event.data }
        }
    }

}

},{"..":10}],14:[function(require,module,exports){
const { domain, Actor } = require("..");
const User = require("./User");
const Transfer = require("./Transfer");

domain.register(User).register(Transfer);

let uid;

async function main(money) {

    let fromUser = await domain.create("User", { name: "fromUser" });
    fromUser.add(100);
    uid = fromUser.id;

    let toUser = await domain.create("User", { name: "toUser" });
    const transfer = await domain.create("Transfer", {});
    try {
        await transfer.transfe(fromUser.id, toUser.id, money);
    }catch(err){
        console.log(err);
    }

    fromUser = await domain.get("User", fromUser.id);
    toUser = await domain.get("User", toUser.id);
    console.log("fromUser's money is ", fromUser.json.money);
    console.log("toUser's money is ", toUser.json.money);
}

main(15);

// main(220);
},{"..":10,"./Transfer":12,"./User":13}],15:[function(require,module,exports){
module.exports = require('./register')().Promise

},{"./register":17}],16:[function(require,module,exports){
"use strict"
    // global key for user preferred registration
var REGISTRATION_KEY = '@@any-promise/REGISTRATION',
    // Prior registration (preferred or detected)
    registered = null

/**
 * Registers the given implementation.  An implementation must
 * be registered prior to any call to `require("any-promise")`,
 * typically on application load.
 *
 * If called with no arguments, will return registration in
 * following priority:
 *
 * For Node.js:
 *
 * 1. Previous registration
 * 2. global.Promise if node.js version >= 0.12
 * 3. Auto detected promise based on first sucessful require of
 *    known promise libraries. Note this is a last resort, as the
 *    loaded library is non-deterministic. node.js >= 0.12 will
 *    always use global.Promise over this priority list.
 * 4. Throws error.
 *
 * For Browser:
 *
 * 1. Previous registration
 * 2. window.Promise
 * 3. Throws error.
 *
 * Options:
 *
 * Promise: Desired Promise constructor
 * global: Boolean - Should the registration be cached in a global variable to
 * allow cross dependency/bundle registration?  (default true)
 */
module.exports = function(root, loadImplementation){
  return function register(implementation, opts){
    implementation = implementation || null
    opts = opts || {}
    // global registration unless explicitly  {global: false} in options (default true)
    var registerGlobal = opts.global !== false;

    // load any previous global registration
    if(registered === null && registerGlobal){
      registered = root[REGISTRATION_KEY] || null
    }

    if(registered !== null
        && implementation !== null
        && registered.implementation !== implementation){
      // Throw error if attempting to redefine implementation
      throw new Error('any-promise already defined as "'+registered.implementation+
        '".  You can only register an implementation before the first '+
        ' call to require("any-promise") and an implementation cannot be changed')
    }

    if(registered === null){
      // use provided implementation
      if(implementation !== null && typeof opts.Promise !== 'undefined'){
        registered = {
          Promise: opts.Promise,
          implementation: implementation
        }
      } else {
        // require implementation if implementation is specified but not provided
        registered = loadImplementation(implementation)
      }

      if(registerGlobal){
        // register preference globally in case multiple installations
        root[REGISTRATION_KEY] = registered
      }
    }

    return registered
  }
}

},{}],17:[function(require,module,exports){
"use strict";
module.exports = require('./loader')(window, loadImplementation)

/**
 * Browser specific loadImplementation.  Always uses `window.Promise`
 *
 * To register a custom implementation, must register with `Promise` option.
 */
function loadImplementation(){
  if(typeof window.Promise === 'undefined'){
    throw new Error("any-promise browser requires a polyfill or explicit registration"+
      " e.g: require('any-promise/register/bluebird')")
  }
  return {
    Promise: window.Promise,
    implementation: 'window.Promise'
  }
}

},{"./loader":16}],18:[function(require,module,exports){
(function (global){
'use strict';

// compare and isBuffer taken from https://github.com/feross/buffer/blob/680e9e5e488f22aac27599a57dc844a6315928dd/index.js
// original notice:

/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */
function compare(a, b) {
  if (a === b) {
    return 0;
  }

  var x = a.length;
  var y = b.length;

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i];
      y = b[i];
      break;
    }
  }

  if (x < y) {
    return -1;
  }
  if (y < x) {
    return 1;
  }
  return 0;
}
function isBuffer(b) {
  if (global.Buffer && typeof global.Buffer.isBuffer === 'function') {
    return global.Buffer.isBuffer(b);
  }
  return !!(b != null && b._isBuffer);
}

// based on node assert, original notice:

// http://wiki.commonjs.org/wiki/Unit_Testing/1.0
//
// THIS IS NOT TESTED NOR LIKELY TO WORK OUTSIDE V8!
//
// Originally from narwhal.js (http://narwhaljs.org)
// Copyright (c) 2009 Thomas Robinson <280north.com>
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the 'Software'), to
// deal in the Software without restriction, including without limitation the
// rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
// sell copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
// ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

var util = require('util/');
var hasOwn = Object.prototype.hasOwnProperty;
var pSlice = Array.prototype.slice;
var functionsHaveNames = (function () {
  return function foo() {}.name === 'foo';
}());
function pToString (obj) {
  return Object.prototype.toString.call(obj);
}
function isView(arrbuf) {
  if (isBuffer(arrbuf)) {
    return false;
  }
  if (typeof global.ArrayBuffer !== 'function') {
    return false;
  }
  if (typeof ArrayBuffer.isView === 'function') {
    return ArrayBuffer.isView(arrbuf);
  }
  if (!arrbuf) {
    return false;
  }
  if (arrbuf instanceof DataView) {
    return true;
  }
  if (arrbuf.buffer && arrbuf.buffer instanceof ArrayBuffer) {
    return true;
  }
  return false;
}
// 1. The assert module provides functions that throw
// AssertionError's when particular conditions are not met. The
// assert module must conform to the following interface.

var assert = module.exports = ok;

// 2. The AssertionError is defined in assert.
// new assert.AssertionError({ message: message,
//                             actual: actual,
//                             expected: expected })

var regex = /\s*function\s+([^\(\s]*)\s*/;
// based on https://github.com/ljharb/function.prototype.name/blob/adeeeec8bfcc6068b187d7d9fb3d5bb1d3a30899/implementation.js
function getName(func) {
  if (!util.isFunction(func)) {
    return;
  }
  if (functionsHaveNames) {
    return func.name;
  }
  var str = func.toString();
  var match = str.match(regex);
  return match && match[1];
}
assert.AssertionError = function AssertionError(options) {
  this.name = 'AssertionError';
  this.actual = options.actual;
  this.expected = options.expected;
  this.operator = options.operator;
  if (options.message) {
    this.message = options.message;
    this.generatedMessage = false;
  } else {
    this.message = getMessage(this);
    this.generatedMessage = true;
  }
  var stackStartFunction = options.stackStartFunction || fail;
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, stackStartFunction);
  } else {
    // non v8 browsers so we can have a stacktrace
    var err = new Error();
    if (err.stack) {
      var out = err.stack;

      // try to strip useless frames
      var fn_name = getName(stackStartFunction);
      var idx = out.indexOf('\n' + fn_name);
      if (idx >= 0) {
        // once we have located the function frame
        // we need to strip out everything before it (and its line)
        var next_line = out.indexOf('\n', idx + 1);
        out = out.substring(next_line + 1);
      }

      this.stack = out;
    }
  }
};

// assert.AssertionError instanceof Error
util.inherits(assert.AssertionError, Error);

function truncate(s, n) {
  if (typeof s === 'string') {
    return s.length < n ? s : s.slice(0, n);
  } else {
    return s;
  }
}
function inspect(something) {
  if (functionsHaveNames || !util.isFunction(something)) {
    return util.inspect(something);
  }
  var rawname = getName(something);
  var name = rawname ? ': ' + rawname : '';
  return '[Function' +  name + ']';
}
function getMessage(self) {
  return truncate(inspect(self.actual), 128) + ' ' +
         self.operator + ' ' +
         truncate(inspect(self.expected), 128);
}

// At present only the three keys mentioned above are used and
// understood by the spec. Implementations or sub modules can pass
// other keys to the AssertionError's constructor - they will be
// ignored.

// 3. All of the following functions must throw an AssertionError
// when a corresponding condition is not met, with a message that
// may be undefined if not provided.  All assertion methods provide
// both the actual and expected values to the assertion error for
// display purposes.

function fail(actual, expected, message, operator, stackStartFunction) {
  throw new assert.AssertionError({
    message: message,
    actual: actual,
    expected: expected,
    operator: operator,
    stackStartFunction: stackStartFunction
  });
}

// EXTENSION! allows for well behaved errors defined elsewhere.
assert.fail = fail;

// 4. Pure assertion tests whether a value is truthy, as determined
// by !!guard.
// assert.ok(guard, message_opt);
// This statement is equivalent to assert.equal(true, !!guard,
// message_opt);. To test strictly for the value true, use
// assert.strictEqual(true, guard, message_opt);.

function ok(value, message) {
  if (!value) fail(value, true, message, '==', assert.ok);
}
assert.ok = ok;

// 5. The equality assertion tests shallow, coercive equality with
// ==.
// assert.equal(actual, expected, message_opt);

assert.equal = function equal(actual, expected, message) {
  if (actual != expected) fail(actual, expected, message, '==', assert.equal);
};

// 6. The non-equality assertion tests for whether two objects are not equal
// with != assert.notEqual(actual, expected, message_opt);

assert.notEqual = function notEqual(actual, expected, message) {
  if (actual == expected) {
    fail(actual, expected, message, '!=', assert.notEqual);
  }
};

// 7. The equivalence assertion tests a deep equality relation.
// assert.deepEqual(actual, expected, message_opt);

assert.deepEqual = function deepEqual(actual, expected, message) {
  if (!_deepEqual(actual, expected, false)) {
    fail(actual, expected, message, 'deepEqual', assert.deepEqual);
  }
};

assert.deepStrictEqual = function deepStrictEqual(actual, expected, message) {
  if (!_deepEqual(actual, expected, true)) {
    fail(actual, expected, message, 'deepStrictEqual', assert.deepStrictEqual);
  }
};

function _deepEqual(actual, expected, strict, memos) {
  // 7.1. All identical values are equivalent, as determined by ===.
  if (actual === expected) {
    return true;
  } else if (isBuffer(actual) && isBuffer(expected)) {
    return compare(actual, expected) === 0;

  // 7.2. If the expected value is a Date object, the actual value is
  // equivalent if it is also a Date object that refers to the same time.
  } else if (util.isDate(actual) && util.isDate(expected)) {
    return actual.getTime() === expected.getTime();

  // 7.3 If the expected value is a RegExp object, the actual value is
  // equivalent if it is also a RegExp object with the same source and
  // properties (`global`, `multiline`, `lastIndex`, `ignoreCase`).
  } else if (util.isRegExp(actual) && util.isRegExp(expected)) {
    return actual.source === expected.source &&
           actual.global === expected.global &&
           actual.multiline === expected.multiline &&
           actual.lastIndex === expected.lastIndex &&
           actual.ignoreCase === expected.ignoreCase;

  // 7.4. Other pairs that do not both pass typeof value == 'object',
  // equivalence is determined by ==.
  } else if ((actual === null || typeof actual !== 'object') &&
             (expected === null || typeof expected !== 'object')) {
    return strict ? actual === expected : actual == expected;

  // If both values are instances of typed arrays, wrap their underlying
  // ArrayBuffers in a Buffer each to increase performance
  // This optimization requires the arrays to have the same type as checked by
  // Object.prototype.toString (aka pToString). Never perform binary
  // comparisons for Float*Arrays, though, since e.g. +0 === -0 but their
  // bit patterns are not identical.
  } else if (isView(actual) && isView(expected) &&
             pToString(actual) === pToString(expected) &&
             !(actual instanceof Float32Array ||
               actual instanceof Float64Array)) {
    return compare(new Uint8Array(actual.buffer),
                   new Uint8Array(expected.buffer)) === 0;

  // 7.5 For all other Object pairs, including Array objects, equivalence is
  // determined by having the same number of owned properties (as verified
  // with Object.prototype.hasOwnProperty.call), the same set of keys
  // (although not necessarily the same order), equivalent values for every
  // corresponding key, and an identical 'prototype' property. Note: this
  // accounts for both named and indexed properties on Arrays.
  } else if (isBuffer(actual) !== isBuffer(expected)) {
    return false;
  } else {
    memos = memos || {actual: [], expected: []};

    var actualIndex = memos.actual.indexOf(actual);
    if (actualIndex !== -1) {
      if (actualIndex === memos.expected.indexOf(expected)) {
        return true;
      }
    }

    memos.actual.push(actual);
    memos.expected.push(expected);

    return objEquiv(actual, expected, strict, memos);
  }
}

function isArguments(object) {
  return Object.prototype.toString.call(object) == '[object Arguments]';
}

function objEquiv(a, b, strict, actualVisitedObjects) {
  if (a === null || a === undefined || b === null || b === undefined)
    return false;
  // if one is a primitive, the other must be same
  if (util.isPrimitive(a) || util.isPrimitive(b))
    return a === b;
  if (strict && Object.getPrototypeOf(a) !== Object.getPrototypeOf(b))
    return false;
  var aIsArgs = isArguments(a);
  var bIsArgs = isArguments(b);
  if ((aIsArgs && !bIsArgs) || (!aIsArgs && bIsArgs))
    return false;
  if (aIsArgs) {
    a = pSlice.call(a);
    b = pSlice.call(b);
    return _deepEqual(a, b, strict);
  }
  var ka = objectKeys(a);
  var kb = objectKeys(b);
  var key, i;
  // having the same number of owned properties (keys incorporates
  // hasOwnProperty)
  if (ka.length !== kb.length)
    return false;
  //the same set of keys (although not necessarily the same order),
  ka.sort();
  kb.sort();
  //~~~cheap key test
  for (i = ka.length - 1; i >= 0; i--) {
    if (ka[i] !== kb[i])
      return false;
  }
  //equivalent values for every corresponding key, and
  //~~~possibly expensive deep test
  for (i = ka.length - 1; i >= 0; i--) {
    key = ka[i];
    if (!_deepEqual(a[key], b[key], strict, actualVisitedObjects))
      return false;
  }
  return true;
}

// 8. The non-equivalence assertion tests for any deep inequality.
// assert.notDeepEqual(actual, expected, message_opt);

assert.notDeepEqual = function notDeepEqual(actual, expected, message) {
  if (_deepEqual(actual, expected, false)) {
    fail(actual, expected, message, 'notDeepEqual', assert.notDeepEqual);
  }
};

assert.notDeepStrictEqual = notDeepStrictEqual;
function notDeepStrictEqual(actual, expected, message) {
  if (_deepEqual(actual, expected, true)) {
    fail(actual, expected, message, 'notDeepStrictEqual', notDeepStrictEqual);
  }
}


// 9. The strict equality assertion tests strict equality, as determined by ===.
// assert.strictEqual(actual, expected, message_opt);

assert.strictEqual = function strictEqual(actual, expected, message) {
  if (actual !== expected) {
    fail(actual, expected, message, '===', assert.strictEqual);
  }
};

// 10. The strict non-equality assertion tests for strict inequality, as
// determined by !==.  assert.notStrictEqual(actual, expected, message_opt);

assert.notStrictEqual = function notStrictEqual(actual, expected, message) {
  if (actual === expected) {
    fail(actual, expected, message, '!==', assert.notStrictEqual);
  }
};

function expectedException(actual, expected) {
  if (!actual || !expected) {
    return false;
  }

  if (Object.prototype.toString.call(expected) == '[object RegExp]') {
    return expected.test(actual);
  }

  try {
    if (actual instanceof expected) {
      return true;
    }
  } catch (e) {
    // Ignore.  The instanceof check doesn't work for arrow functions.
  }

  if (Error.isPrototypeOf(expected)) {
    return false;
  }

  return expected.call({}, actual) === true;
}

function _tryBlock(block) {
  var error;
  try {
    block();
  } catch (e) {
    error = e;
  }
  return error;
}

function _throws(shouldThrow, block, expected, message) {
  var actual;

  if (typeof block !== 'function') {
    throw new TypeError('"block" argument must be a function');
  }

  if (typeof expected === 'string') {
    message = expected;
    expected = null;
  }

  actual = _tryBlock(block);

  message = (expected && expected.name ? ' (' + expected.name + ').' : '.') +
            (message ? ' ' + message : '.');

  if (shouldThrow && !actual) {
    fail(actual, expected, 'Missing expected exception' + message);
  }

  var userProvidedMessage = typeof message === 'string';
  var isUnwantedException = !shouldThrow && util.isError(actual);
  var isUnexpectedException = !shouldThrow && actual && !expected;

  if ((isUnwantedException &&
      userProvidedMessage &&
      expectedException(actual, expected)) ||
      isUnexpectedException) {
    fail(actual, expected, 'Got unwanted exception' + message);
  }

  if ((shouldThrow && actual && expected &&
      !expectedException(actual, expected)) || (!shouldThrow && actual)) {
    throw actual;
  }
}

// 11. Expected to throw an error:
// assert.throws(block, Error_opt, message_opt);

assert.throws = function(block, /*optional*/error, /*optional*/message) {
  _throws(true, block, error, message);
};

// EXTENSION! This is annoying to write outside this module.
assert.doesNotThrow = function(block, /*optional*/error, /*optional*/message) {
  _throws(false, block, error, message);
};

assert.ifError = function(err) { if (err) throw err; };

var objectKeys = Object.keys || function (obj) {
  var keys = [];
  for (var key in obj) {
    if (hasOwn.call(obj, key)) keys.push(key);
  }
  return keys;
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"util/":45}],19:[function(require,module,exports){
module.exports.BinarySearchTree = require('./lib/bst');
module.exports.AVLTree = require('./lib/avltree');

},{"./lib/avltree":20,"./lib/bst":21}],20:[function(require,module,exports){
/**
 * Self-balancing binary search tree using the AVL implementation
 */
var BinarySearchTree = require('./bst')
  , customUtils = require('./customUtils')
  , util = require('util')
  , _ = require('underscore')
  ;


/**
 * Constructor
 * We can't use a direct pointer to the root node (as in the simple binary search tree)
 * as the root will change during tree rotations
 * @param {Boolean}  options.unique Whether to enforce a 'unique' constraint on the key or not
 * @param {Function} options.compareKeys Initialize this BST's compareKeys
 */
function AVLTree (options) {
  this.tree = new _AVLTree(options);
}


/**
 * Constructor of the internal AVLTree
 * @param {Object} options Optional
 * @param {Boolean}  options.unique Whether to enforce a 'unique' constraint on the key or not
 * @param {Key}      options.key Initialize this BST's key with key
 * @param {Value}    options.value Initialize this BST's data with [value]
 * @param {Function} options.compareKeys Initialize this BST's compareKeys
 */
function _AVLTree (options) {
  options = options || {};

  this.left = null;
  this.right = null;
  this.parent = options.parent !== undefined ? options.parent : null;
  if (options.hasOwnProperty('key')) { this.key = options.key; }
  this.data = options.hasOwnProperty('value') ? [options.value] : [];
  this.unique = options.unique || false;

  this.compareKeys = options.compareKeys || customUtils.defaultCompareKeysFunction;
  this.checkValueEquality = options.checkValueEquality || customUtils.defaultCheckValueEquality;
}


/**
 * Inherit basic functions from the basic binary search tree
 */
util.inherits(_AVLTree, BinarySearchTree);

/**
 * Keep a pointer to the internal tree constructor for testing purposes
 */
AVLTree._AVLTree = _AVLTree;


/**
 * Check the recorded height is correct for every node
 * Throws if one height doesn't match
 */
_AVLTree.prototype.checkHeightCorrect = function () {
  var leftH, rightH;

  if (!this.hasOwnProperty('key')) { return; }   // Empty tree

  if (this.left && this.left.height === undefined) { throw new Error("Undefined height for node " + this.left.key); }
  if (this.right && this.right.height === undefined) { throw new Error("Undefined height for node " + this.right.key); }
  if (this.height === undefined) { throw new Error("Undefined height for node " + this.key); }

  leftH = this.left ? this.left.height : 0;
  rightH = this.right ? this.right.height : 0;

  if (this.height !== 1 + Math.max(leftH, rightH)) { throw new Error("Height constraint failed for node " + this.key); }
  if (this.left) { this.left.checkHeightCorrect(); }
  if (this.right) { this.right.checkHeightCorrect(); }
};


/**
 * Return the balance factor
 */
_AVLTree.prototype.balanceFactor = function () {
  var leftH = this.left ? this.left.height : 0
    , rightH = this.right ? this.right.height : 0
    ;
  return leftH - rightH;
};


/**
 * Check that the balance factors are all between -1 and 1
 */
_AVLTree.prototype.checkBalanceFactors = function () {
  if (Math.abs(this.balanceFactor()) > 1) { throw new Error('Tree is unbalanced at node ' + this.key); }

  if (this.left) { this.left.checkBalanceFactors(); }
  if (this.right) { this.right.checkBalanceFactors(); }
};


/**
 * When checking if the BST conditions are met, also check that the heights are correct
 * and the tree is balanced
 */
_AVLTree.prototype.checkIsAVLT = function () {
  _AVLTree.super_.prototype.checkIsBST.call(this);
  this.checkHeightCorrect();
  this.checkBalanceFactors();
};
AVLTree.prototype.checkIsAVLT = function () { this.tree.checkIsAVLT(); };


/**
 * Perform a right rotation of the tree if possible
 * and return the root of the resulting tree
 * The resulting tree's nodes' heights are also updated
 */
_AVLTree.prototype.rightRotation = function () {
  var q = this
    , p = this.left
    , b
    , ah, bh, ch;

  if (!p) { return this; }   // No change

  b = p.right;

  // Alter tree structure
  if (q.parent) {
    p.parent = q.parent;
    if (q.parent.left === q) { q.parent.left = p; } else { q.parent.right = p; }
  } else {
    p.parent = null;
  }
  p.right = q;
  q.parent = p;
  q.left = b;
  if (b) { b.parent = q; }

  // Update heights
  ah = p.left ? p.left.height : 0;
  bh = b ? b.height : 0;
  ch = q.right ? q.right.height : 0;
  q.height = Math.max(bh, ch) + 1;
  p.height = Math.max(ah, q.height) + 1;

  return p;
};


/**
 * Perform a left rotation of the tree if possible
 * and return the root of the resulting tree
 * The resulting tree's nodes' heights are also updated
 */
_AVLTree.prototype.leftRotation = function () {
  var p = this
    , q = this.right
    , b
    , ah, bh, ch;

  if (!q) { return this; }   // No change

  b = q.left;

  // Alter tree structure
  if (p.parent) {
    q.parent = p.parent;
    if (p.parent.left === p) { p.parent.left = q; } else { p.parent.right = q; }
  } else {
    q.parent = null;
  }
  q.left = p;
  p.parent = q;
  p.right = b;
  if (b) { b.parent = p; }

  // Update heights
  ah = p.left ? p.left.height : 0;
  bh = b ? b.height : 0;
  ch = q.right ? q.right.height : 0;
  p.height = Math.max(ah, bh) + 1;
  q.height = Math.max(ch, p.height) + 1;

  return q;
};


/**
 * Modify the tree if its right subtree is too small compared to the left
 * Return the new root if any
 */
_AVLTree.prototype.rightTooSmall = function () {
  if (this.balanceFactor() <= 1) { return this; }   // Right is not too small, don't change

  if (this.left.balanceFactor() < 0) {
    this.left.leftRotation();
  }

  return this.rightRotation();
};


/**
 * Modify the tree if its left subtree is too small compared to the right
 * Return the new root if any
 */
_AVLTree.prototype.leftTooSmall = function () {
  if (this.balanceFactor() >= -1) { return this; }   // Left is not too small, don't change

  if (this.right.balanceFactor() > 0) {
    this.right.rightRotation();
  }

  return this.leftRotation();
};


/**
 * Rebalance the tree along the given path. The path is given reversed (as he was calculated
 * in the insert and delete functions).
 * Returns the new root of the tree
 * Of course, the first element of the path must be the root of the tree
 */
_AVLTree.prototype.rebalanceAlongPath = function (path) {
  var newRoot = this
    , rotated
    , i;

  if (!this.hasOwnProperty('key')) { delete this.height; return this; }   // Empty tree

  // Rebalance the tree and update all heights
  for (i = path.length - 1; i >= 0; i -= 1) {
    path[i].height = 1 + Math.max(path[i].left ? path[i].left.height : 0, path[i].right ? path[i].right.height : 0);

    if (path[i].balanceFactor() > 1) {
      rotated = path[i].rightTooSmall();
      if (i === 0) { newRoot = rotated; }
    }

    if (path[i].balanceFactor() < -1) {
      rotated = path[i].leftTooSmall();
      if (i === 0) { newRoot = rotated; }
    }
  }

  return newRoot;
};


/**
 * Insert a key, value pair in the tree while maintaining the AVL tree height constraint
 * Return a pointer to the root node, which may have changed
 */
_AVLTree.prototype.insert = function (key, value) {
  var insertPath = []
    , currentNode = this
    ;

  // Empty tree, insert as root
  if (!this.hasOwnProperty('key')) {
    this.key = key;
    this.data.push(value);
    this.height = 1;
    return this;
  }

  // Insert new leaf at the right place
  while (true) {
    // Same key: no change in the tree structure
    if (currentNode.compareKeys(currentNode.key, key) === 0) {
      if (currentNode.unique) {
        var err = new Error("Can't insert key " + key + ", it violates the unique constraint");
        err.key = key;
        err.errorType = 'uniqueViolated';
        throw err;
      } else {
        currentNode.data.push(value);
      }
      return this;
    }

    insertPath.push(currentNode);

    if (currentNode.compareKeys(key, currentNode.key) < 0) {
      if (!currentNode.left) {
        insertPath.push(currentNode.createLeftChild({ key: key, value: value }));
        break;
      } else {
        currentNode = currentNode.left;
      }
    } else {
      if (!currentNode.right) {
        insertPath.push(currentNode.createRightChild({ key: key, value: value }));
        break;
      } else {
        currentNode = currentNode.right;
      }
    }
  }

  return this.rebalanceAlongPath(insertPath);
};

// Insert in the internal tree, update the pointer to the root if needed
AVLTree.prototype.insert = function (key, value) {
  var newTree = this.tree.insert(key, value);

  // If newTree is undefined, that means its structure was not modified
  if (newTree) { this.tree = newTree; }
};


/**
 * Delete a key or just a value and return the new root of the tree
 * @param {Key} key
 * @param {Value} value Optional. If not set, the whole key is deleted. If set, only this value is deleted
 */
_AVLTree.prototype.delete = function (key, value) {
  var newData = [], replaceWith
    , self = this
    , currentNode = this
    , deletePath = []
    ;

  if (!this.hasOwnProperty('key')) { return this; }   // Empty tree

  // Either no match is found and the function will return from within the loop
  // Or a match is found and deletePath will contain the path from the root to the node to delete after the loop
  while (true) {
    if (currentNode.compareKeys(key, currentNode.key) === 0) { break; }

    deletePath.push(currentNode);

    if (currentNode.compareKeys(key, currentNode.key) < 0) {
      if (currentNode.left) {
        currentNode = currentNode.left;
      } else {
        return this;   // Key not found, no modification
      }
    } else {
      // currentNode.compareKeys(key, currentNode.key) is > 0
      if (currentNode.right) {
        currentNode = currentNode.right;
      } else {
        return this;   // Key not found, no modification
      }
    }
  }

  // Delete only a value (no tree modification)
  if (currentNode.data.length > 1 && value) {
    currentNode.data.forEach(function (d) {
      if (!currentNode.checkValueEquality(d, value)) { newData.push(d); }
    });
    currentNode.data = newData;
    return this;
  }

  // Delete a whole node

  // Leaf
  if (!currentNode.left && !currentNode.right) {
    if (currentNode === this) {   // This leaf is also the root
      delete currentNode.key;
      currentNode.data = [];
      delete currentNode.height;
      return this;
    } else {
      if (currentNode.parent.left === currentNode) {
        currentNode.parent.left = null;
      } else {
        currentNode.parent.right = null;
      }
      return this.rebalanceAlongPath(deletePath);
    }
  }


  // Node with only one child
  if (!currentNode.left || !currentNode.right) {
    replaceWith = currentNode.left ? currentNode.left : currentNode.right;

    if (currentNode === this) {   // This node is also the root
      replaceWith.parent = null;
      return replaceWith;   // height of replaceWith is necessarily 1 because the tree was balanced before deletion
    } else {
      if (currentNode.parent.left === currentNode) {
        currentNode.parent.left = replaceWith;
        replaceWith.parent = currentNode.parent;
      } else {
        currentNode.parent.right = replaceWith;
        replaceWith.parent = currentNode.parent;
      }

      return this.rebalanceAlongPath(deletePath);
    }
  }


  // Node with two children
  // Use the in-order predecessor (no need to randomize since we actively rebalance)
  deletePath.push(currentNode);
  replaceWith = currentNode.left;

  // Special case: the in-order predecessor is right below the node to delete
  if (!replaceWith.right) {
    currentNode.key = replaceWith.key;
    currentNode.data = replaceWith.data;
    currentNode.left = replaceWith.left;
    if (replaceWith.left) { replaceWith.left.parent = currentNode; }
    return this.rebalanceAlongPath(deletePath);
  }

  // After this loop, replaceWith is the right-most leaf in the left subtree
  // and deletePath the path from the root (inclusive) to replaceWith (exclusive)
  while (true) {
    if (replaceWith.right) {
      deletePath.push(replaceWith);
      replaceWith = replaceWith.right;
    } else {
      break;
    }
  }

  currentNode.key = replaceWith.key;
  currentNode.data = replaceWith.data;

  replaceWith.parent.right = replaceWith.left;
  if (replaceWith.left) { replaceWith.left.parent = replaceWith.parent; }

  return this.rebalanceAlongPath(deletePath);
};

// Delete a value
AVLTree.prototype.delete = function (key, value) {
  var newTree = this.tree.delete(key, value);

  // If newTree is undefined, that means its structure was not modified
  if (newTree) { this.tree = newTree; }
};


/**
 * Other functions we want to use on an AVLTree as if it were the internal _AVLTree
 */
['getNumberOfKeys', 'search', 'betweenBounds', 'prettyPrint', 'executeOnEveryNode'].forEach(function (fn) {
  AVLTree.prototype[fn] = function () {
    return this.tree[fn].apply(this.tree, arguments);
  };
});


// Interface
module.exports = AVLTree;

},{"./bst":21,"./customUtils":22,"underscore":42,"util":45}],21:[function(require,module,exports){
/**
 * Simple binary search tree
 */
var customUtils = require('./customUtils');


/**
 * Constructor
 * @param {Object} options Optional
 * @param {Boolean}  options.unique Whether to enforce a 'unique' constraint on the key or not
 * @param {Key}      options.key Initialize this BST's key with key
 * @param {Value}    options.value Initialize this BST's data with [value]
 * @param {Function} options.compareKeys Initialize this BST's compareKeys
 */
function BinarySearchTree (options) {
  options = options || {};

  this.left = null;
  this.right = null;
  this.parent = options.parent !== undefined ? options.parent : null;
  if (options.hasOwnProperty('key')) { this.key = options.key; }
  this.data = options.hasOwnProperty('value') ? [options.value] : [];
  this.unique = options.unique || false;

  this.compareKeys = options.compareKeys || customUtils.defaultCompareKeysFunction;
  this.checkValueEquality = options.checkValueEquality || customUtils.defaultCheckValueEquality;
}


// ================================
// Methods used to test the tree
// ================================


/**
 * Get the descendant with max key
 */
BinarySearchTree.prototype.getMaxKeyDescendant = function () {
  if (this.right) {
    return this.right.getMaxKeyDescendant();
  } else {
    return this;
  }
};


/**
 * Get the maximum key
 */
BinarySearchTree.prototype.getMaxKey = function () {
  return this.getMaxKeyDescendant().key;
};


/**
 * Get the descendant with min key
 */
BinarySearchTree.prototype.getMinKeyDescendant = function () {
  if (this.left) {
    return this.left.getMinKeyDescendant()
  } else {
    return this;
  }
};


/**
 * Get the minimum key
 */
BinarySearchTree.prototype.getMinKey = function () {
  return this.getMinKeyDescendant().key;
};


/**
 * Check that all nodes (incl. leaves) fullfil condition given by fn
 * test is a function passed every (key, data) and which throws if the condition is not met
 */
BinarySearchTree.prototype.checkAllNodesFullfillCondition = function (test) {
  if (!this.hasOwnProperty('key')) { return; }

  test(this.key, this.data);
  if (this.left) { this.left.checkAllNodesFullfillCondition(test); }
  if (this.right) { this.right.checkAllNodesFullfillCondition(test); }
};


/**
 * Check that the core BST properties on node ordering are verified
 * Throw if they aren't
 */
BinarySearchTree.prototype.checkNodeOrdering = function () {
  var self = this;

  if (!this.hasOwnProperty('key')) { return; }

  if (this.left) {
    this.left.checkAllNodesFullfillCondition(function (k) {
      if (self.compareKeys(k, self.key) >= 0) {
        throw new Error('Tree with root ' + self.key + ' is not a binary search tree');
      }
    });
    this.left.checkNodeOrdering();
  }

  if (this.right) {
    this.right.checkAllNodesFullfillCondition(function (k) {
      if (self.compareKeys(k, self.key) <= 0) {
        throw new Error('Tree with root ' + self.key + ' is not a binary search tree');
      }
    });
    this.right.checkNodeOrdering();
  }
};


/**
 * Check that all pointers are coherent in this tree
 */
BinarySearchTree.prototype.checkInternalPointers = function () {
  if (this.left) {
    if (this.left.parent !== this) { throw new Error('Parent pointer broken for key ' + this.key); }
    this.left.checkInternalPointers();
  }

  if (this.right) {
    if (this.right.parent !== this) { throw new Error('Parent pointer broken for key ' + this.key); }
    this.right.checkInternalPointers();
  }
};


/**
 * Check that a tree is a BST as defined here (node ordering and pointer references)
 */
BinarySearchTree.prototype.checkIsBST = function () {
  this.checkNodeOrdering();
  this.checkInternalPointers();
  if (this.parent) { throw new Error("The root shouldn't have a parent"); }
};


/**
 * Get number of keys inserted
 */
BinarySearchTree.prototype.getNumberOfKeys = function () {
  var res;

  if (!this.hasOwnProperty('key')) { return 0; }

  res = 1;
  if (this.left) { res += this.left.getNumberOfKeys(); }
  if (this.right) { res += this.right.getNumberOfKeys(); }

  return res;
};



// ============================================
// Methods used to actually work on the tree
// ============================================

/**
 * Create a BST similar (i.e. same options except for key and value) to the current one
 * Use the same constructor (i.e. BinarySearchTree, AVLTree etc)
 * @param {Object} options see constructor
 */
BinarySearchTree.prototype.createSimilar = function (options) {
  options = options || {};
  options.unique = this.unique;
  options.compareKeys = this.compareKeys;
  options.checkValueEquality = this.checkValueEquality;

  return new this.constructor(options);
};


/**
 * Create the left child of this BST and return it
 */
BinarySearchTree.prototype.createLeftChild = function (options) {
  var leftChild = this.createSimilar(options);
  leftChild.parent = this;
  this.left = leftChild;

  return leftChild;
};


/**
 * Create the right child of this BST and return it
 */
BinarySearchTree.prototype.createRightChild = function (options) {
  var rightChild = this.createSimilar(options);
  rightChild.parent = this;
  this.right = rightChild;

  return rightChild;
};


/**
 * Insert a new element
 */
BinarySearchTree.prototype.insert = function (key, value) {
  // Empty tree, insert as root
  if (!this.hasOwnProperty('key')) {
    this.key = key;
    this.data.push(value);
    return;
  }

  // Same key as root
  if (this.compareKeys(this.key, key) === 0) {
    if (this.unique) {
      var err = new Error("Can't insert key " + key + ", it violates the unique constraint");
      err.key = key;
      err.errorType = 'uniqueViolated';
      throw err;
    } else {
      this.data.push(value);
    }
    return;
  }

  if (this.compareKeys(key, this.key) < 0) {
    // Insert in left subtree
    if (this.left) {
      this.left.insert(key, value);
    } else {
      this.createLeftChild({ key: key, value: value });
    }
  } else {
    // Insert in right subtree
    if (this.right) {
      this.right.insert(key, value);
    } else {
      this.createRightChild({ key: key, value: value });
    }
  }
};


/**
 * Search for all data corresponding to a key
 */
BinarySearchTree.prototype.search = function (key) {
  if (!this.hasOwnProperty('key')) { return []; }

  if (this.compareKeys(this.key, key) === 0) { return this.data; }

  if (this.compareKeys(key, this.key) < 0) {
    if (this.left) {
      return this.left.search(key);
    } else {
      return [];
    }
  } else {
    if (this.right) {
      return this.right.search(key);
    } else {
      return [];
    }
  }
};


/**
 * Return a function that tells whether a given key matches a lower bound
 */
BinarySearchTree.prototype.getLowerBoundMatcher = function (query) {
  var self = this;

  // No lower bound
  if (!query.hasOwnProperty('$gt') && !query.hasOwnProperty('$gte')) {
    return function () { return true; };
  }

  if (query.hasOwnProperty('$gt') && query.hasOwnProperty('$gte')) {
    if (self.compareKeys(query.$gte, query.$gt) === 0) {
      return function (key) { return self.compareKeys(key, query.$gt) > 0; };
    }

    if (self.compareKeys(query.$gte, query.$gt) > 0) {
      return function (key) { return self.compareKeys(key, query.$gte) >= 0; };
    } else {
      return function (key) { return self.compareKeys(key, query.$gt) > 0; };
    }
  }

  if (query.hasOwnProperty('$gt')) {
    return function (key) { return self.compareKeys(key, query.$gt) > 0; };
  } else {
    return function (key) { return self.compareKeys(key, query.$gte) >= 0; };
  }
};


/**
 * Return a function that tells whether a given key matches an upper bound
 */
BinarySearchTree.prototype.getUpperBoundMatcher = function (query) {
  var self = this;

  // No lower bound
  if (!query.hasOwnProperty('$lt') && !query.hasOwnProperty('$lte')) {
    return function () { return true; };
  }

  if (query.hasOwnProperty('$lt') && query.hasOwnProperty('$lte')) {
    if (self.compareKeys(query.$lte, query.$lt) === 0) {
      return function (key) { return self.compareKeys(key, query.$lt) < 0; };
    }

    if (self.compareKeys(query.$lte, query.$lt) < 0) {
      return function (key) { return self.compareKeys(key, query.$lte) <= 0; };
    } else {
      return function (key) { return self.compareKeys(key, query.$lt) < 0; };
    }
  }

  if (query.hasOwnProperty('$lt')) {
    return function (key) { return self.compareKeys(key, query.$lt) < 0; };
  } else {
    return function (key) { return self.compareKeys(key, query.$lte) <= 0; };
  }
};


// Append all elements in toAppend to array
function append (array, toAppend) {
  var i;

  for (i = 0; i < toAppend.length; i += 1) {
    array.push(toAppend[i]);
  }
}


/**
 * Get all data for a key between bounds
 * Return it in key order
 * @param {Object} query Mongo-style query where keys are $lt, $lte, $gt or $gte (other keys are not considered)
 * @param {Functions} lbm/ubm matching functions calculated at the first recursive step
 */
BinarySearchTree.prototype.betweenBounds = function (query, lbm, ubm) {
  var res = [];

  if (!this.hasOwnProperty('key')) { return []; }   // Empty tree

  lbm = lbm || this.getLowerBoundMatcher(query);
  ubm = ubm || this.getUpperBoundMatcher(query);

  if (lbm(this.key) && this.left) { append(res, this.left.betweenBounds(query, lbm, ubm)); }
  if (lbm(this.key) && ubm(this.key)) { append(res, this.data); }
  if (ubm(this.key) && this.right) { append(res, this.right.betweenBounds(query, lbm, ubm)); }

  return res;
};


/**
 * Delete the current node if it is a leaf
 * Return true if it was deleted
 */
BinarySearchTree.prototype.deleteIfLeaf = function () {
  if (this.left || this.right) { return false; }

  // The leaf is itself a root
  if (!this.parent) {
    delete this.key;
    this.data = [];
    return true;
  }

  if (this.parent.left === this) {
    this.parent.left = null;
  } else {
    this.parent.right = null;
  }

  return true;
};


/**
 * Delete the current node if it has only one child
 * Return true if it was deleted
 */
BinarySearchTree.prototype.deleteIfOnlyOneChild = function () {
  var child;

  if (this.left && !this.right) { child = this.left; }
  if (!this.left && this.right) { child = this.right; }
  if (!child) { return false; }

  // Root
  if (!this.parent) {
    this.key = child.key;
    this.data = child.data;

    this.left = null;
    if (child.left) {
      this.left = child.left;
      child.left.parent = this;
    }

    this.right = null;
    if (child.right) {
      this.right = child.right;
      child.right.parent = this;
    }

    return true;
  }

  if (this.parent.left === this) {
    this.parent.left = child;
    child.parent = this.parent;
  } else {
    this.parent.right = child;
    child.parent = this.parent;
  }

  return true;
};


/**
 * Delete a key or just a value
 * @param {Key} key
 * @param {Value} value Optional. If not set, the whole key is deleted. If set, only this value is deleted
 */
BinarySearchTree.prototype.delete = function (key, value) {
  var newData = [], replaceWith
    , self = this
    ;

  if (!this.hasOwnProperty('key')) { return; }

  if (this.compareKeys(key, this.key) < 0) {
    if (this.left) { this.left.delete(key, value); }
    return;
  }

  if (this.compareKeys(key, this.key) > 0) {
    if (this.right) { this.right.delete(key, value); }
    return;
  }

  if (!this.compareKeys(key, this.key) === 0) { return; }

  // Delete only a value
  if (this.data.length > 1 && value !== undefined) {
    this.data.forEach(function (d) {
      if (!self.checkValueEquality(d, value)) { newData.push(d); }
    });
    self.data = newData;
    return;
  }

  // Delete the whole node
  if (this.deleteIfLeaf()) {
    return;
  }
  if (this.deleteIfOnlyOneChild()) {
    return;
  }

  // We are in the case where the node to delete has two children
  if (Math.random() >= 0.5) {   // Randomize replacement to avoid unbalancing the tree too much
    // Use the in-order predecessor
    replaceWith = this.left.getMaxKeyDescendant();

    this.key = replaceWith.key;
    this.data = replaceWith.data;

    if (this === replaceWith.parent) {   // Special case
      this.left = replaceWith.left;
      if (replaceWith.left) { replaceWith.left.parent = replaceWith.parent; }
    } else {
      replaceWith.parent.right = replaceWith.left;
      if (replaceWith.left) { replaceWith.left.parent = replaceWith.parent; }
    }
  } else {
    // Use the in-order successor
    replaceWith = this.right.getMinKeyDescendant();

    this.key = replaceWith.key;
    this.data = replaceWith.data;

    if (this === replaceWith.parent) {   // Special case
      this.right = replaceWith.right;
      if (replaceWith.right) { replaceWith.right.parent = replaceWith.parent; }
    } else {
      replaceWith.parent.left = replaceWith.right;
      if (replaceWith.right) { replaceWith.right.parent = replaceWith.parent; }
    }
  }
};


/**
 * Execute a function on every node of the tree, in key order
 * @param {Function} fn Signature: node. Most useful will probably be node.key and node.data
 */
BinarySearchTree.prototype.executeOnEveryNode = function (fn) {
  if (this.left) { this.left.executeOnEveryNode(fn); }
  fn(this);
  if (this.right) { this.right.executeOnEveryNode(fn); }
};


/**
 * Pretty print a tree
 * @param {Boolean} printData To print the nodes' data along with the key
 */
BinarySearchTree.prototype.prettyPrint = function (printData, spacing) {
  spacing = spacing || "";

  console.log(spacing + "* " + this.key);
  if (printData) { console.log(spacing + "* " + this.data); }

  if (!this.left && !this.right) { return; }

  if (this.left) {
    this.left.prettyPrint(printData, spacing + "  ");
  } else {
    console.log(spacing + "  *");
  }
  if (this.right) {
    this.right.prettyPrint(printData, spacing + "  ");
  } else {
    console.log(spacing + "  *");
  }
};




// Interface
module.exports = BinarySearchTree;

},{"./customUtils":22}],22:[function(require,module,exports){
/**
 * Return an array with the numbers from 0 to n-1, in a random order
 */
function getRandomArray (n) {
  var res, next;

  if (n === 0) { return []; }
  if (n === 1) { return [0]; }

  res = getRandomArray(n - 1);
  next = Math.floor(Math.random() * n);
  res.splice(next, 0, n - 1);   // Add n-1 at a random position in the array

  return res;
};
module.exports.getRandomArray = getRandomArray;


/*
 * Default compareKeys function will work for numbers, strings and dates
 */
function defaultCompareKeysFunction (a, b) {
  if (a < b) { return -1; }
  if (a > b) { return 1; }
  if (a === b) { return 0; }

  var err = new Error("Couldn't compare elements");
  err.a = a;
  err.b = b;
  throw err;
}
module.exports.defaultCompareKeysFunction = defaultCompareKeysFunction;


/**
 * Check whether two values are equal (used in non-unique deletion)
 */
function defaultCheckValueEquality (a, b) {
  return a === b;
}
module.exports.defaultCheckValueEquality = defaultCheckValueEquality;

},{}],23:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      } else {
        // At least give some kind of context to the user
        var err = new Error('Uncaught, unspecified "error" event. (' + er + ')');
        err.context = er;
        throw err;
      }
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        args = Array.prototype.slice.call(arguments, 1);
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    args = Array.prototype.slice.call(arguments, 1);
    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else if (listeners) {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.prototype.listenerCount = function(type) {
  if (this._events) {
    var evlistener = this._events[type];

    if (isFunction(evlistener))
      return 1;
    else if (evlistener)
      return evlistener.length;
  }
  return 0;
};

EventEmitter.listenerCount = function(emitter, type) {
  return emitter.listenerCount(type);
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],24:[function(require,module,exports){
(function (global){
/*!
    localForage -- Offline Storage, Improved
    Version 1.5.0
    https://localforage.github.io/localForage
    (c) 2013-2017 Mozilla, Apache License 2.0
*/
(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.localforage = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw (f.code="MODULE_NOT_FOUND", f)}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
(function (global){
'use strict';
var Mutation = global.MutationObserver || global.WebKitMutationObserver;

var scheduleDrain;

{
  if (Mutation) {
    var called = 0;
    var observer = new Mutation(nextTick);
    var element = global.document.createTextNode('');
    observer.observe(element, {
      characterData: true
    });
    scheduleDrain = function () {
      element.data = (called = ++called % 2);
    };
  } else if (!global.setImmediate && typeof global.MessageChannel !== 'undefined') {
    var channel = new global.MessageChannel();
    channel.port1.onmessage = nextTick;
    scheduleDrain = function () {
      channel.port2.postMessage(0);
    };
  } else if ('document' in global && 'onreadystatechange' in global.document.createElement('script')) {
    scheduleDrain = function () {

      // Create a <script> element; its readystatechange event will be fired asynchronously once it is inserted
      // into the document. Do so, thus queuing up the task. Remember to clean up once it's been called.
      var scriptEl = global.document.createElement('script');
      scriptEl.onreadystatechange = function () {
        nextTick();

        scriptEl.onreadystatechange = null;
        scriptEl.parentNode.removeChild(scriptEl);
        scriptEl = null;
      };
      global.document.documentElement.appendChild(scriptEl);
    };
  } else {
    scheduleDrain = function () {
      setTimeout(nextTick, 0);
    };
  }
}

var draining;
var queue = [];
//named nextTick for less confusing stack traces
function nextTick() {
  draining = true;
  var i, oldQueue;
  var len = queue.length;
  while (len) {
    oldQueue = queue;
    queue = [];
    i = -1;
    while (++i < len) {
      oldQueue[i]();
    }
    len = queue.length;
  }
  draining = false;
}

module.exports = immediate;
function immediate(task) {
  if (queue.push(task) === 1 && !draining) {
    scheduleDrain();
  }
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],2:[function(_dereq_,module,exports){
'use strict';
var immediate = _dereq_(1);

/* istanbul ignore next */
function INTERNAL() {}

var handlers = {};

var REJECTED = ['REJECTED'];
var FULFILLED = ['FULFILLED'];
var PENDING = ['PENDING'];

module.exports = exports = Promise;

function Promise(resolver) {
  if (typeof resolver !== 'function') {
    throw new TypeError('resolver must be a function');
  }
  this.state = PENDING;
  this.queue = [];
  this.outcome = void 0;
  if (resolver !== INTERNAL) {
    safelyResolveThenable(this, resolver);
  }
}

Promise.prototype["catch"] = function (onRejected) {
  return this.then(null, onRejected);
};
Promise.prototype.then = function (onFulfilled, onRejected) {
  if (typeof onFulfilled !== 'function' && this.state === FULFILLED ||
    typeof onRejected !== 'function' && this.state === REJECTED) {
    return this;
  }
  var promise = new this.constructor(INTERNAL);
  if (this.state !== PENDING) {
    var resolver = this.state === FULFILLED ? onFulfilled : onRejected;
    unwrap(promise, resolver, this.outcome);
  } else {
    this.queue.push(new QueueItem(promise, onFulfilled, onRejected));
  }

  return promise;
};
function QueueItem(promise, onFulfilled, onRejected) {
  this.promise = promise;
  if (typeof onFulfilled === 'function') {
    this.onFulfilled = onFulfilled;
    this.callFulfilled = this.otherCallFulfilled;
  }
  if (typeof onRejected === 'function') {
    this.onRejected = onRejected;
    this.callRejected = this.otherCallRejected;
  }
}
QueueItem.prototype.callFulfilled = function (value) {
  handlers.resolve(this.promise, value);
};
QueueItem.prototype.otherCallFulfilled = function (value) {
  unwrap(this.promise, this.onFulfilled, value);
};
QueueItem.prototype.callRejected = function (value) {
  handlers.reject(this.promise, value);
};
QueueItem.prototype.otherCallRejected = function (value) {
  unwrap(this.promise, this.onRejected, value);
};

function unwrap(promise, func, value) {
  immediate(function () {
    var returnValue;
    try {
      returnValue = func(value);
    } catch (e) {
      return handlers.reject(promise, e);
    }
    if (returnValue === promise) {
      handlers.reject(promise, new TypeError('Cannot resolve promise with itself'));
    } else {
      handlers.resolve(promise, returnValue);
    }
  });
}

handlers.resolve = function (self, value) {
  var result = tryCatch(getThen, value);
  if (result.status === 'error') {
    return handlers.reject(self, result.value);
  }
  var thenable = result.value;

  if (thenable) {
    safelyResolveThenable(self, thenable);
  } else {
    self.state = FULFILLED;
    self.outcome = value;
    var i = -1;
    var len = self.queue.length;
    while (++i < len) {
      self.queue[i].callFulfilled(value);
    }
  }
  return self;
};
handlers.reject = function (self, error) {
  self.state = REJECTED;
  self.outcome = error;
  var i = -1;
  var len = self.queue.length;
  while (++i < len) {
    self.queue[i].callRejected(error);
  }
  return self;
};

function getThen(obj) {
  // Make sure we only access the accessor once as required by the spec
  var then = obj && obj.then;
  if (obj && typeof obj === 'object' && typeof then === 'function') {
    return function appyThen() {
      then.apply(obj, arguments);
    };
  }
}

function safelyResolveThenable(self, thenable) {
  // Either fulfill, reject or reject with error
  var called = false;
  function onError(value) {
    if (called) {
      return;
    }
    called = true;
    handlers.reject(self, value);
  }

  function onSuccess(value) {
    if (called) {
      return;
    }
    called = true;
    handlers.resolve(self, value);
  }

  function tryToUnwrap() {
    thenable(onSuccess, onError);
  }

  var result = tryCatch(tryToUnwrap);
  if (result.status === 'error') {
    onError(result.value);
  }
}

function tryCatch(func, value) {
  var out = {};
  try {
    out.value = func(value);
    out.status = 'success';
  } catch (e) {
    out.status = 'error';
    out.value = e;
  }
  return out;
}

exports.resolve = resolve;
function resolve(value) {
  if (value instanceof this) {
    return value;
  }
  return handlers.resolve(new this(INTERNAL), value);
}

exports.reject = reject;
function reject(reason) {
  var promise = new this(INTERNAL);
  return handlers.reject(promise, reason);
}

exports.all = all;
function all(iterable) {
  var self = this;
  if (Object.prototype.toString.call(iterable) !== '[object Array]') {
    return this.reject(new TypeError('must be an array'));
  }

  var len = iterable.length;
  var called = false;
  if (!len) {
    return this.resolve([]);
  }

  var values = new Array(len);
  var resolved = 0;
  var i = -1;
  var promise = new this(INTERNAL);

  while (++i < len) {
    allResolver(iterable[i], i);
  }
  return promise;
  function allResolver(value, i) {
    self.resolve(value).then(resolveFromAll, function (error) {
      if (!called) {
        called = true;
        handlers.reject(promise, error);
      }
    });
    function resolveFromAll(outValue) {
      values[i] = outValue;
      if (++resolved === len && !called) {
        called = true;
        handlers.resolve(promise, values);
      }
    }
  }
}

exports.race = race;
function race(iterable) {
  var self = this;
  if (Object.prototype.toString.call(iterable) !== '[object Array]') {
    return this.reject(new TypeError('must be an array'));
  }

  var len = iterable.length;
  var called = false;
  if (!len) {
    return this.resolve([]);
  }

  var i = -1;
  var promise = new this(INTERNAL);

  while (++i < len) {
    resolver(iterable[i]);
  }
  return promise;
  function resolver(value) {
    self.resolve(value).then(function (response) {
      if (!called) {
        called = true;
        handlers.resolve(promise, response);
      }
    }, function (error) {
      if (!called) {
        called = true;
        handlers.reject(promise, error);
      }
    });
  }
}

},{"1":1}],3:[function(_dereq_,module,exports){
(function (global){
'use strict';
if (typeof global.Promise !== 'function') {
  global.Promise = _dereq_(2);
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"2":2}],4:[function(_dereq_,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function getIDB() {
    /* global indexedDB,webkitIndexedDB,mozIndexedDB,OIndexedDB,msIndexedDB */
    try {
        if (typeof indexedDB !== 'undefined') {
            return indexedDB;
        }
        if (typeof webkitIndexedDB !== 'undefined') {
            return webkitIndexedDB;
        }
        if (typeof mozIndexedDB !== 'undefined') {
            return mozIndexedDB;
        }
        if (typeof OIndexedDB !== 'undefined') {
            return OIndexedDB;
        }
        if (typeof msIndexedDB !== 'undefined') {
            return msIndexedDB;
        }
    } catch (e) {}
}

var idb = getIDB();

function isIndexedDBValid() {
    try {
        // Initialize IndexedDB; fall back to vendor-prefixed versions
        // if needed.
        if (!idb) {
            return false;
        }
        // We mimic PouchDB here;
        //
        // We test for openDatabase because IE Mobile identifies itself
        // as Safari. Oh the lulz...
        var isSafari = typeof openDatabase !== 'undefined' && /(Safari|iPhone|iPad|iPod)/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent) && !/BlackBerry/.test(navigator.platform);

        var hasFetch = typeof fetch === 'function' && fetch.toString().indexOf('[native code') !== -1;

        // Safari <10.1 does not meet our requirements for IDB support (#5572)
        // since Safari 10.1 shipped with fetch, we can use that to detect it
        return (!isSafari || hasFetch) && typeof indexedDB !== 'undefined' &&
        // some outdated implementations of IDB that appear on Samsung
        // and HTC Android devices <4.4 are missing IDBKeyRange
        typeof IDBKeyRange !== 'undefined';
    } catch (e) {
        return false;
    }
}

function isWebSQLValid() {
    return typeof openDatabase === 'function';
}

function isLocalStorageValid() {
    try {
        return typeof localStorage !== 'undefined' && 'setItem' in localStorage && localStorage.setItem;
    } catch (e) {
        return false;
    }
}

// Abstracts constructing a Blob object, so it also works in older
// browsers that don't support the native Blob constructor. (i.e.
// old QtWebKit versions, at least).
// Abstracts constructing a Blob object, so it also works in older
// browsers that don't support the native Blob constructor. (i.e.
// old QtWebKit versions, at least).
function createBlob(parts, properties) {
    /* global BlobBuilder,MSBlobBuilder,MozBlobBuilder,WebKitBlobBuilder */
    parts = parts || [];
    properties = properties || {};
    try {
        return new Blob(parts, properties);
    } catch (e) {
        if (e.name !== 'TypeError') {
            throw e;
        }
        var Builder = typeof BlobBuilder !== 'undefined' ? BlobBuilder : typeof MSBlobBuilder !== 'undefined' ? MSBlobBuilder : typeof MozBlobBuilder !== 'undefined' ? MozBlobBuilder : WebKitBlobBuilder;
        var builder = new Builder();
        for (var i = 0; i < parts.length; i += 1) {
            builder.append(parts[i]);
        }
        return builder.getBlob(properties.type);
    }
}

// This is CommonJS because lie is an external dependency, so Rollup
// can just ignore it.
if (typeof Promise === 'undefined') {
    // In the "nopromises" build this will just throw if you don't have
    // a global promise object, but it would throw anyway later.
    _dereq_(3);
}
var Promise$1 = Promise;

function executeCallback(promise, callback) {
    if (callback) {
        promise.then(function (result) {
            callback(null, result);
        }, function (error) {
            callback(error);
        });
    }
}

function executeTwoCallbacks(promise, callback, errorCallback) {
    if (typeof callback === 'function') {
        promise.then(callback);
    }

    if (typeof errorCallback === 'function') {
        promise["catch"](errorCallback);
    }
}

// Some code originally from async_storage.js in
// [Gaia](https://github.com/mozilla-b2g/gaia).

var DETECT_BLOB_SUPPORT_STORE = 'local-forage-detect-blob-support';
var supportsBlobs;
var dbContexts;
var toString = Object.prototype.toString;

// Transform a binary string to an array buffer, because otherwise
// weird stuff happens when you try to work with the binary string directly.
// It is known.
// From http://stackoverflow.com/questions/14967647/ (continues on next line)
// encode-decode-image-with-base64-breaks-image (2013-04-21)
function _binStringToArrayBuffer(bin) {
    var length = bin.length;
    var buf = new ArrayBuffer(length);
    var arr = new Uint8Array(buf);
    for (var i = 0; i < length; i++) {
        arr[i] = bin.charCodeAt(i);
    }
    return buf;
}

//
// Blobs are not supported in all versions of IndexedDB, notably
// Chrome <37 and Android <5. In those versions, storing a blob will throw.
//
// Various other blob bugs exist in Chrome v37-42 (inclusive).
// Detecting them is expensive and confusing to users, and Chrome 37-42
// is at very low usage worldwide, so we do a hacky userAgent check instead.
//
// content-type bug: https://code.google.com/p/chromium/issues/detail?id=408120
// 404 bug: https://code.google.com/p/chromium/issues/detail?id=447916
// FileReader bug: https://code.google.com/p/chromium/issues/detail?id=447836
//
// Code borrowed from PouchDB. See:
// https://github.com/pouchdb/pouchdb/blob/master/packages/node_modules/pouchdb-adapter-idb/src/blobSupport.js
//
function _checkBlobSupportWithoutCaching(idb) {
    return new Promise$1(function (resolve) {
        var txn = idb.transaction(DETECT_BLOB_SUPPORT_STORE, 'readwrite');
        var blob = createBlob(['']);
        txn.objectStore(DETECT_BLOB_SUPPORT_STORE).put(blob, 'key');

        txn.onabort = function (e) {
            // If the transaction aborts now its due to not being able to
            // write to the database, likely due to the disk being full
            e.preventDefault();
            e.stopPropagation();
            resolve(false);
        };

        txn.oncomplete = function () {
            var matchedChrome = navigator.userAgent.match(/Chrome\/(\d+)/);
            var matchedEdge = navigator.userAgent.match(/Edge\//);
            // MS Edge pretends to be Chrome 42:
            // https://msdn.microsoft.com/en-us/library/hh869301%28v=vs.85%29.aspx
            resolve(matchedEdge || !matchedChrome || parseInt(matchedChrome[1], 10) >= 43);
        };
    })["catch"](function () {
        return false; // error, so assume unsupported
    });
}

function _checkBlobSupport(idb) {
    if (typeof supportsBlobs === 'boolean') {
        return Promise$1.resolve(supportsBlobs);
    }
    return _checkBlobSupportWithoutCaching(idb).then(function (value) {
        supportsBlobs = value;
        return supportsBlobs;
    });
}

function _deferReadiness(dbInfo) {
    var dbContext = dbContexts[dbInfo.name];

    // Create a deferred object representing the current database operation.
    var deferredOperation = {};

    deferredOperation.promise = new Promise$1(function (resolve) {
        deferredOperation.resolve = resolve;
    });

    // Enqueue the deferred operation.
    dbContext.deferredOperations.push(deferredOperation);

    // Chain its promise to the database readiness.
    if (!dbContext.dbReady) {
        dbContext.dbReady = deferredOperation.promise;
    } else {
        dbContext.dbReady = dbContext.dbReady.then(function () {
            return deferredOperation.promise;
        });
    }
}

function _advanceReadiness(dbInfo) {
    var dbContext = dbContexts[dbInfo.name];

    // Dequeue a deferred operation.
    var deferredOperation = dbContext.deferredOperations.pop();

    // Resolve its promise (which is part of the database readiness
    // chain of promises).
    if (deferredOperation) {
        deferredOperation.resolve();
    }
}

function _getConnection(dbInfo, upgradeNeeded) {
    return new Promise$1(function (resolve, reject) {

        if (dbInfo.db) {
            if (upgradeNeeded) {
                _deferReadiness(dbInfo);
                dbInfo.db.close();
            } else {
                return resolve(dbInfo.db);
            }
        }

        var dbArgs = [dbInfo.name];

        if (upgradeNeeded) {
            dbArgs.push(dbInfo.version);
        }

        var openreq = idb.open.apply(idb, dbArgs);

        if (upgradeNeeded) {
            openreq.onupgradeneeded = function (e) {
                var db = openreq.result;
                try {
                    db.createObjectStore(dbInfo.storeName);
                    if (e.oldVersion <= 1) {
                        // Added when support for blob shims was added
                        db.createObjectStore(DETECT_BLOB_SUPPORT_STORE);
                    }
                } catch (ex) {
                    if (ex.name === 'ConstraintError') {
                        console.warn('The database "' + dbInfo.name + '"' + ' has been upgraded from version ' + e.oldVersion + ' to version ' + e.newVersion + ', but the storage "' + dbInfo.storeName + '" already exists.');
                    } else {
                        throw ex;
                    }
                }
            };
        }

        openreq.onerror = function (e) {
            e.preventDefault();
            reject(openreq.error);
        };

        openreq.onsuccess = function () {
            resolve(openreq.result);
            _advanceReadiness(dbInfo);
        };
    });
}

function _getOriginalConnection(dbInfo) {
    return _getConnection(dbInfo, false);
}

function _getUpgradedConnection(dbInfo) {
    return _getConnection(dbInfo, true);
}

function _isUpgradeNeeded(dbInfo, defaultVersion) {
    if (!dbInfo.db) {
        return true;
    }

    var isNewStore = !dbInfo.db.objectStoreNames.contains(dbInfo.storeName);
    var isDowngrade = dbInfo.version < dbInfo.db.version;
    var isUpgrade = dbInfo.version > dbInfo.db.version;

    if (isDowngrade) {
        // If the version is not the default one
        // then warn for impossible downgrade.
        if (dbInfo.version !== defaultVersion) {
            console.warn('The database "' + dbInfo.name + '"' + ' can\'t be downgraded from version ' + dbInfo.db.version + ' to version ' + dbInfo.version + '.');
        }
        // Align the versions to prevent errors.
        dbInfo.version = dbInfo.db.version;
    }

    if (isUpgrade || isNewStore) {
        // If the store is new then increment the version (if needed).
        // This will trigger an "upgradeneeded" event which is required
        // for creating a store.
        if (isNewStore) {
            var incVersion = dbInfo.db.version + 1;
            if (incVersion > dbInfo.version) {
                dbInfo.version = incVersion;
            }
        }

        return true;
    }

    return false;
}

// encode a blob for indexeddb engines that don't support blobs
function _encodeBlob(blob) {
    return new Promise$1(function (resolve, reject) {
        var reader = new FileReader();
        reader.onerror = reject;
        reader.onloadend = function (e) {
            var base64 = btoa(e.target.result || '');
            resolve({
                __local_forage_encoded_blob: true,
                data: base64,
                type: blob.type
            });
        };
        reader.readAsBinaryString(blob);
    });
}

// decode an encoded blob
function _decodeBlob(encodedBlob) {
    var arrayBuff = _binStringToArrayBuffer(atob(encodedBlob.data));
    return createBlob([arrayBuff], { type: encodedBlob.type });
}

// is this one of our fancy encoded blobs?
function _isEncodedBlob(value) {
    return value && value.__local_forage_encoded_blob;
}

// Specialize the default `ready()` function by making it dependent
// on the current database operations. Thus, the driver will be actually
// ready when it's been initialized (default) *and* there are no pending
// operations on the database (initiated by some other instances).
function _fullyReady(callback) {
    var self = this;

    var promise = self._initReady().then(function () {
        var dbContext = dbContexts[self._dbInfo.name];

        if (dbContext && dbContext.dbReady) {
            return dbContext.dbReady;
        }
    });

    executeTwoCallbacks(promise, callback, callback);
    return promise;
}

// Open the IndexedDB database (automatically creates one if one didn't
// previously exist), using any options set in the config.
function _initStorage(options) {
    var self = this;
    var dbInfo = {
        db: null
    };

    if (options) {
        for (var i in options) {
            dbInfo[i] = options[i];
        }
    }

    // Initialize a singleton container for all running localForages.
    if (!dbContexts) {
        dbContexts = {};
    }

    // Get the current context of the database;
    var dbContext = dbContexts[dbInfo.name];

    // ...or create a new context.
    if (!dbContext) {
        dbContext = {
            // Running localForages sharing a database.
            forages: [],
            // Shared database.
            db: null,
            // Database readiness (promise).
            dbReady: null,
            // Deferred operations on the database.
            deferredOperations: []
        };
        // Register the new context in the global container.
        dbContexts[dbInfo.name] = dbContext;
    }

    // Register itself as a running localForage in the current context.
    dbContext.forages.push(self);

    // Replace the default `ready()` function with the specialized one.
    if (!self._initReady) {
        self._initReady = self.ready;
        self.ready = _fullyReady;
    }

    // Create an array of initialization states of the related localForages.
    var initPromises = [];

    function ignoreErrors() {
        // Don't handle errors here,
        // just makes sure related localForages aren't pending.
        return Promise$1.resolve();
    }

    for (var j = 0; j < dbContext.forages.length; j++) {
        var forage = dbContext.forages[j];
        if (forage !== self) {
            // Don't wait for itself...
            initPromises.push(forage._initReady()["catch"](ignoreErrors));
        }
    }

    // Take a snapshot of the related localForages.
    var forages = dbContext.forages.slice(0);

    // Initialize the connection process only when
    // all the related localForages aren't pending.
    return Promise$1.all(initPromises).then(function () {
        dbInfo.db = dbContext.db;
        // Get the connection or open a new one without upgrade.
        return _getOriginalConnection(dbInfo);
    }).then(function (db) {
        dbInfo.db = db;
        if (_isUpgradeNeeded(dbInfo, self._defaultConfig.version)) {
            // Reopen the database for upgrading.
            return _getUpgradedConnection(dbInfo);
        }
        return db;
    }).then(function (db) {
        dbInfo.db = dbContext.db = db;
        self._dbInfo = dbInfo;
        // Share the final connection amongst related localForages.
        for (var k = 0; k < forages.length; k++) {
            var forage = forages[k];
            if (forage !== self) {
                // Self is already up-to-date.
                forage._dbInfo.db = dbInfo.db;
                forage._dbInfo.version = dbInfo.version;
            }
        }
    });
}

function getItem(key, callback) {
    var self = this;

    // Cast the key to a string, as that's all we can set as a key.
    if (typeof key !== 'string') {
        console.warn(key + ' used as a key, but it is not a string.');
        key = String(key);
    }

    var promise = new Promise$1(function (resolve, reject) {
        self.ready().then(function () {
            var dbInfo = self._dbInfo;
            var store = dbInfo.db.transaction(dbInfo.storeName, 'readonly').objectStore(dbInfo.storeName);
            var req = store.get(key);

            req.onsuccess = function () {
                var value = req.result;
                if (value === undefined) {
                    value = null;
                }
                if (_isEncodedBlob(value)) {
                    value = _decodeBlob(value);
                }
                resolve(value);
            };

            req.onerror = function () {
                reject(req.error);
            };
        })["catch"](reject);
    });

    executeCallback(promise, callback);
    return promise;
}

// Iterate over all items stored in database.
function iterate(iterator, callback) {
    var self = this;

    var promise = new Promise$1(function (resolve, reject) {
        self.ready().then(function () {
            var dbInfo = self._dbInfo;
            var store = dbInfo.db.transaction(dbInfo.storeName, 'readonly').objectStore(dbInfo.storeName);

            var req = store.openCursor();
            var iterationNumber = 1;

            req.onsuccess = function () {
                var cursor = req.result;

                if (cursor) {
                    var value = cursor.value;
                    if (_isEncodedBlob(value)) {
                        value = _decodeBlob(value);
                    }
                    var result = iterator(value, cursor.key, iterationNumber++);

                    if (result !== void 0) {
                        resolve(result);
                    } else {
                        cursor["continue"]();
                    }
                } else {
                    resolve();
                }
            };

            req.onerror = function () {
                reject(req.error);
            };
        })["catch"](reject);
    });

    executeCallback(promise, callback);

    return promise;
}

function setItem(key, value, callback) {
    var self = this;

    // Cast the key to a string, as that's all we can set as a key.
    if (typeof key !== 'string') {
        console.warn(key + ' used as a key, but it is not a string.');
        key = String(key);
    }

    var promise = new Promise$1(function (resolve, reject) {
        var dbInfo;
        self.ready().then(function () {
            dbInfo = self._dbInfo;
            if (toString.call(value) === '[object Blob]') {
                return _checkBlobSupport(dbInfo.db).then(function (blobSupport) {
                    if (blobSupport) {
                        return value;
                    }
                    return _encodeBlob(value);
                });
            }
            return value;
        }).then(function (value) {
            var transaction = dbInfo.db.transaction(dbInfo.storeName, 'readwrite');
            var store = transaction.objectStore(dbInfo.storeName);
            var req = store.put(value, key);

            // The reason we don't _save_ null is because IE 10 does
            // not support saving the `null` type in IndexedDB. How
            // ironic, given the bug below!
            // See: https://github.com/mozilla/localForage/issues/161
            if (value === null) {
                value = undefined;
            }

            transaction.oncomplete = function () {
                // Cast to undefined so the value passed to
                // callback/promise is the same as what one would get out
                // of `getItem()` later. This leads to some weirdness
                // (setItem('foo', undefined) will return `null`), but
                // it's not my fault localStorage is our baseline and that
                // it's weird.
                if (value === undefined) {
                    value = null;
                }

                resolve(value);
            };
            transaction.onabort = transaction.onerror = function () {
                var err = req.error ? req.error : req.transaction.error;
                reject(err);
            };
        })["catch"](reject);
    });

    executeCallback(promise, callback);
    return promise;
}

function removeItem(key, callback) {
    var self = this;

    // Cast the key to a string, as that's all we can set as a key.
    if (typeof key !== 'string') {
        console.warn(key + ' used as a key, but it is not a string.');
        key = String(key);
    }

    var promise = new Promise$1(function (resolve, reject) {
        self.ready().then(function () {
            var dbInfo = self._dbInfo;
            var transaction = dbInfo.db.transaction(dbInfo.storeName, 'readwrite');
            var store = transaction.objectStore(dbInfo.storeName);

            // We use a Grunt task to make this safe for IE and some
            // versions of Android (including those used by Cordova).
            // Normally IE won't like `.delete()` and will insist on
            // using `['delete']()`, but we have a build step that
            // fixes this for us now.
            var req = store["delete"](key);
            transaction.oncomplete = function () {
                resolve();
            };

            transaction.onerror = function () {
                reject(req.error);
            };

            // The request will be also be aborted if we've exceeded our storage
            // space.
            transaction.onabort = function () {
                var err = req.error ? req.error : req.transaction.error;
                reject(err);
            };
        })["catch"](reject);
    });

    executeCallback(promise, callback);
    return promise;
}

function clear(callback) {
    var self = this;

    var promise = new Promise$1(function (resolve, reject) {
        self.ready().then(function () {
            var dbInfo = self._dbInfo;
            var transaction = dbInfo.db.transaction(dbInfo.storeName, 'readwrite');
            var store = transaction.objectStore(dbInfo.storeName);
            var req = store.clear();

            transaction.oncomplete = function () {
                resolve();
            };

            transaction.onabort = transaction.onerror = function () {
                var err = req.error ? req.error : req.transaction.error;
                reject(err);
            };
        })["catch"](reject);
    });

    executeCallback(promise, callback);
    return promise;
}

function length(callback) {
    var self = this;

    var promise = new Promise$1(function (resolve, reject) {
        self.ready().then(function () {
            var dbInfo = self._dbInfo;
            var store = dbInfo.db.transaction(dbInfo.storeName, 'readonly').objectStore(dbInfo.storeName);
            var req = store.count();

            req.onsuccess = function () {
                resolve(req.result);
            };

            req.onerror = function () {
                reject(req.error);
            };
        })["catch"](reject);
    });

    executeCallback(promise, callback);
    return promise;
}

function key(n, callback) {
    var self = this;

    var promise = new Promise$1(function (resolve, reject) {
        if (n < 0) {
            resolve(null);

            return;
        }

        self.ready().then(function () {
            var dbInfo = self._dbInfo;
            var store = dbInfo.db.transaction(dbInfo.storeName, 'readonly').objectStore(dbInfo.storeName);

            var advanced = false;
            var req = store.openCursor();
            req.onsuccess = function () {
                var cursor = req.result;
                if (!cursor) {
                    // this means there weren't enough keys
                    resolve(null);

                    return;
                }

                if (n === 0) {
                    // We have the first key, return it if that's what they
                    // wanted.
                    resolve(cursor.key);
                } else {
                    if (!advanced) {
                        // Otherwise, ask the cursor to skip ahead n
                        // records.
                        advanced = true;
                        cursor.advance(n);
                    } else {
                        // When we get here, we've got the nth key.
                        resolve(cursor.key);
                    }
                }
            };

            req.onerror = function () {
                reject(req.error);
            };
        })["catch"](reject);
    });

    executeCallback(promise, callback);
    return promise;
}

function keys(callback) {
    var self = this;

    var promise = new Promise$1(function (resolve, reject) {
        self.ready().then(function () {
            var dbInfo = self._dbInfo;
            var store = dbInfo.db.transaction(dbInfo.storeName, 'readonly').objectStore(dbInfo.storeName);

            var req = store.openCursor();
            var keys = [];

            req.onsuccess = function () {
                var cursor = req.result;

                if (!cursor) {
                    resolve(keys);
                    return;
                }

                keys.push(cursor.key);
                cursor["continue"]();
            };

            req.onerror = function () {
                reject(req.error);
            };
        })["catch"](reject);
    });

    executeCallback(promise, callback);
    return promise;
}

var asyncStorage = {
    _driver: 'asyncStorage',
    _initStorage: _initStorage,
    iterate: iterate,
    getItem: getItem,
    setItem: setItem,
    removeItem: removeItem,
    clear: clear,
    length: length,
    key: key,
    keys: keys
};

// Sadly, the best way to save binary data in WebSQL/localStorage is serializing
// it to Base64, so this is how we store it to prevent very strange errors with less
// verbose ways of binary <-> string data storage.
var BASE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

var BLOB_TYPE_PREFIX = '~~local_forage_type~';
var BLOB_TYPE_PREFIX_REGEX = /^~~local_forage_type~([^~]+)~/;

var SERIALIZED_MARKER = '__lfsc__:';
var SERIALIZED_MARKER_LENGTH = SERIALIZED_MARKER.length;

// OMG the serializations!
var TYPE_ARRAYBUFFER = 'arbf';
var TYPE_BLOB = 'blob';
var TYPE_INT8ARRAY = 'si08';
var TYPE_UINT8ARRAY = 'ui08';
var TYPE_UINT8CLAMPEDARRAY = 'uic8';
var TYPE_INT16ARRAY = 'si16';
var TYPE_INT32ARRAY = 'si32';
var TYPE_UINT16ARRAY = 'ur16';
var TYPE_UINT32ARRAY = 'ui32';
var TYPE_FLOAT32ARRAY = 'fl32';
var TYPE_FLOAT64ARRAY = 'fl64';
var TYPE_SERIALIZED_MARKER_LENGTH = SERIALIZED_MARKER_LENGTH + TYPE_ARRAYBUFFER.length;

var toString$1 = Object.prototype.toString;

function stringToBuffer(serializedString) {
    // Fill the string into a ArrayBuffer.
    var bufferLength = serializedString.length * 0.75;
    var len = serializedString.length;
    var i;
    var p = 0;
    var encoded1, encoded2, encoded3, encoded4;

    if (serializedString[serializedString.length - 1] === '=') {
        bufferLength--;
        if (serializedString[serializedString.length - 2] === '=') {
            bufferLength--;
        }
    }

    var buffer = new ArrayBuffer(bufferLength);
    var bytes = new Uint8Array(buffer);

    for (i = 0; i < len; i += 4) {
        encoded1 = BASE_CHARS.indexOf(serializedString[i]);
        encoded2 = BASE_CHARS.indexOf(serializedString[i + 1]);
        encoded3 = BASE_CHARS.indexOf(serializedString[i + 2]);
        encoded4 = BASE_CHARS.indexOf(serializedString[i + 3]);

        /*jslint bitwise: true */
        bytes[p++] = encoded1 << 2 | encoded2 >> 4;
        bytes[p++] = (encoded2 & 15) << 4 | encoded3 >> 2;
        bytes[p++] = (encoded3 & 3) << 6 | encoded4 & 63;
    }
    return buffer;
}

// Converts a buffer to a string to store, serialized, in the backend
// storage library.
function bufferToString(buffer) {
    // base64-arraybuffer
    var bytes = new Uint8Array(buffer);
    var base64String = '';
    var i;

    for (i = 0; i < bytes.length; i += 3) {
        /*jslint bitwise: true */
        base64String += BASE_CHARS[bytes[i] >> 2];
        base64String += BASE_CHARS[(bytes[i] & 3) << 4 | bytes[i + 1] >> 4];
        base64String += BASE_CHARS[(bytes[i + 1] & 15) << 2 | bytes[i + 2] >> 6];
        base64String += BASE_CHARS[bytes[i + 2] & 63];
    }

    if (bytes.length % 3 === 2) {
        base64String = base64String.substring(0, base64String.length - 1) + '=';
    } else if (bytes.length % 3 === 1) {
        base64String = base64String.substring(0, base64String.length - 2) + '==';
    }

    return base64String;
}

// Serialize a value, afterwards executing a callback (which usually
// instructs the `setItem()` callback/promise to be executed). This is how
// we store binary data with localStorage.
function serialize(value, callback) {
    var valueType = '';
    if (value) {
        valueType = toString$1.call(value);
    }

    // Cannot use `value instanceof ArrayBuffer` or such here, as these
    // checks fail when running the tests using casper.js...
    //
    // TODO: See why those tests fail and use a better solution.
    if (value && (valueType === '[object ArrayBuffer]' || value.buffer && toString$1.call(value.buffer) === '[object ArrayBuffer]')) {
        // Convert binary arrays to a string and prefix the string with
        // a special marker.
        var buffer;
        var marker = SERIALIZED_MARKER;

        if (value instanceof ArrayBuffer) {
            buffer = value;
            marker += TYPE_ARRAYBUFFER;
        } else {
            buffer = value.buffer;

            if (valueType === '[object Int8Array]') {
                marker += TYPE_INT8ARRAY;
            } else if (valueType === '[object Uint8Array]') {
                marker += TYPE_UINT8ARRAY;
            } else if (valueType === '[object Uint8ClampedArray]') {
                marker += TYPE_UINT8CLAMPEDARRAY;
            } else if (valueType === '[object Int16Array]') {
                marker += TYPE_INT16ARRAY;
            } else if (valueType === '[object Uint16Array]') {
                marker += TYPE_UINT16ARRAY;
            } else if (valueType === '[object Int32Array]') {
                marker += TYPE_INT32ARRAY;
            } else if (valueType === '[object Uint32Array]') {
                marker += TYPE_UINT32ARRAY;
            } else if (valueType === '[object Float32Array]') {
                marker += TYPE_FLOAT32ARRAY;
            } else if (valueType === '[object Float64Array]') {
                marker += TYPE_FLOAT64ARRAY;
            } else {
                callback(new Error('Failed to get type for BinaryArray'));
            }
        }

        callback(marker + bufferToString(buffer));
    } else if (valueType === '[object Blob]') {
        // Conver the blob to a binaryArray and then to a string.
        var fileReader = new FileReader();

        fileReader.onload = function () {
            // Backwards-compatible prefix for the blob type.
            var str = BLOB_TYPE_PREFIX + value.type + '~' + bufferToString(this.result);

            callback(SERIALIZED_MARKER + TYPE_BLOB + str);
        };

        fileReader.readAsArrayBuffer(value);
    } else {
        try {
            callback(JSON.stringify(value));
        } catch (e) {
            console.error("Couldn't convert value into a JSON string: ", value);

            callback(null, e);
        }
    }
}

// Deserialize data we've inserted into a value column/field. We place
// special markers into our strings to mark them as encoded; this isn't
// as nice as a meta field, but it's the only sane thing we can do whilst
// keeping localStorage support intact.
//
// Oftentimes this will just deserialize JSON content, but if we have a
// special marker (SERIALIZED_MARKER, defined above), we will extract
// some kind of arraybuffer/binary data/typed array out of the string.
function deserialize(value) {
    // If we haven't marked this string as being specially serialized (i.e.
    // something other than serialized JSON), we can just return it and be
    // done with it.
    if (value.substring(0, SERIALIZED_MARKER_LENGTH) !== SERIALIZED_MARKER) {
        return JSON.parse(value);
    }

    // The following code deals with deserializing some kind of Blob or
    // TypedArray. First we separate out the type of data we're dealing
    // with from the data itself.
    var serializedString = value.substring(TYPE_SERIALIZED_MARKER_LENGTH);
    var type = value.substring(SERIALIZED_MARKER_LENGTH, TYPE_SERIALIZED_MARKER_LENGTH);

    var blobType;
    // Backwards-compatible blob type serialization strategy.
    // DBs created with older versions of localForage will simply not have the blob type.
    if (type === TYPE_BLOB && BLOB_TYPE_PREFIX_REGEX.test(serializedString)) {
        var matcher = serializedString.match(BLOB_TYPE_PREFIX_REGEX);
        blobType = matcher[1];
        serializedString = serializedString.substring(matcher[0].length);
    }
    var buffer = stringToBuffer(serializedString);

    // Return the right type based on the code/type set during
    // serialization.
    switch (type) {
        case TYPE_ARRAYBUFFER:
            return buffer;
        case TYPE_BLOB:
            return createBlob([buffer], { type: blobType });
        case TYPE_INT8ARRAY:
            return new Int8Array(buffer);
        case TYPE_UINT8ARRAY:
            return new Uint8Array(buffer);
        case TYPE_UINT8CLAMPEDARRAY:
            return new Uint8ClampedArray(buffer);
        case TYPE_INT16ARRAY:
            return new Int16Array(buffer);
        case TYPE_UINT16ARRAY:
            return new Uint16Array(buffer);
        case TYPE_INT32ARRAY:
            return new Int32Array(buffer);
        case TYPE_UINT32ARRAY:
            return new Uint32Array(buffer);
        case TYPE_FLOAT32ARRAY:
            return new Float32Array(buffer);
        case TYPE_FLOAT64ARRAY:
            return new Float64Array(buffer);
        default:
            throw new Error('Unkown type: ' + type);
    }
}

var localforageSerializer = {
    serialize: serialize,
    deserialize: deserialize,
    stringToBuffer: stringToBuffer,
    bufferToString: bufferToString
};

/*
 * Includes code from:
 *
 * base64-arraybuffer
 * https://github.com/niklasvh/base64-arraybuffer
 *
 * Copyright (c) 2012 Niklas von Hertzen
 * Licensed under the MIT license.
 */
// Open the WebSQL database (automatically creates one if one didn't
// previously exist), using any options set in the config.
function _initStorage$1(options) {
    var self = this;
    var dbInfo = {
        db: null
    };

    if (options) {
        for (var i in options) {
            dbInfo[i] = typeof options[i] !== 'string' ? options[i].toString() : options[i];
        }
    }

    var dbInfoPromise = new Promise$1(function (resolve, reject) {
        // Open the database; the openDatabase API will automatically
        // create it for us if it doesn't exist.
        try {
            dbInfo.db = openDatabase(dbInfo.name, String(dbInfo.version), dbInfo.description, dbInfo.size);
        } catch (e) {
            return reject(e);
        }

        // Create our key/value table if it doesn't exist.
        dbInfo.db.transaction(function (t) {
            t.executeSql('CREATE TABLE IF NOT EXISTS ' + dbInfo.storeName + ' (id INTEGER PRIMARY KEY, key unique, value)', [], function () {
                self._dbInfo = dbInfo;
                resolve();
            }, function (t, error) {
                reject(error);
            });
        });
    });

    dbInfo.serializer = localforageSerializer;
    return dbInfoPromise;
}

function getItem$1(key, callback) {
    var self = this;

    // Cast the key to a string, as that's all we can set as a key.
    if (typeof key !== 'string') {
        console.warn(key + ' used as a key, but it is not a string.');
        key = String(key);
    }

    var promise = new Promise$1(function (resolve, reject) {
        self.ready().then(function () {
            var dbInfo = self._dbInfo;
            dbInfo.db.transaction(function (t) {
                t.executeSql('SELECT * FROM ' + dbInfo.storeName + ' WHERE key = ? LIMIT 1', [key], function (t, results) {
                    var result = results.rows.length ? results.rows.item(0).value : null;

                    // Check to see if this is serialized content we need to
                    // unpack.
                    if (result) {
                        result = dbInfo.serializer.deserialize(result);
                    }

                    resolve(result);
                }, function (t, error) {

                    reject(error);
                });
            });
        })["catch"](reject);
    });

    executeCallback(promise, callback);
    return promise;
}

function iterate$1(iterator, callback) {
    var self = this;

    var promise = new Promise$1(function (resolve, reject) {
        self.ready().then(function () {
            var dbInfo = self._dbInfo;

            dbInfo.db.transaction(function (t) {
                t.executeSql('SELECT * FROM ' + dbInfo.storeName, [], function (t, results) {
                    var rows = results.rows;
                    var length = rows.length;

                    for (var i = 0; i < length; i++) {
                        var item = rows.item(i);
                        var result = item.value;

                        // Check to see if this is serialized content
                        // we need to unpack.
                        if (result) {
                            result = dbInfo.serializer.deserialize(result);
                        }

                        result = iterator(result, item.key, i + 1);

                        // void(0) prevents problems with redefinition
                        // of `undefined`.
                        if (result !== void 0) {
                            resolve(result);
                            return;
                        }
                    }

                    resolve();
                }, function (t, error) {
                    reject(error);
                });
            });
        })["catch"](reject);
    });

    executeCallback(promise, callback);
    return promise;
}

function _setItem(key, value, callback, retriesLeft) {
    var self = this;

    // Cast the key to a string, as that's all we can set as a key.
    if (typeof key !== 'string') {
        console.warn(key + ' used as a key, but it is not a string.');
        key = String(key);
    }

    var promise = new Promise$1(function (resolve, reject) {
        self.ready().then(function () {
            // The localStorage API doesn't return undefined values in an
            // "expected" way, so undefined is always cast to null in all
            // drivers. See: https://github.com/mozilla/localForage/pull/42
            if (value === undefined) {
                value = null;
            }

            // Save the original value to pass to the callback.
            var originalValue = value;

            var dbInfo = self._dbInfo;
            dbInfo.serializer.serialize(value, function (value, error) {
                if (error) {
                    reject(error);
                } else {
                    dbInfo.db.transaction(function (t) {
                        t.executeSql('INSERT OR REPLACE INTO ' + dbInfo.storeName + ' (key, value) VALUES (?, ?)', [key, value], function () {
                            resolve(originalValue);
                        }, function (t, error) {
                            reject(error);
                        });
                    }, function (sqlError) {
                        // The transaction failed; check
                        // to see if it's a quota error.
                        if (sqlError.code === sqlError.QUOTA_ERR) {
                            // We reject the callback outright for now, but
                            // it's worth trying to re-run the transaction.
                            // Even if the user accepts the prompt to use
                            // more storage on Safari, this error will
                            // be called.
                            //
                            // Try to re-run the transaction.
                            if (retriesLeft > 0) {
                                resolve(_setItem.apply(self, [key, originalValue, callback, retriesLeft - 1]));
                                return;
                            }
                            reject(sqlError);
                        }
                    });
                }
            });
        })["catch"](reject);
    });

    executeCallback(promise, callback);
    return promise;
}

function setItem$1(key, value, callback) {
    return _setItem.apply(this, [key, value, callback, 1]);
}

function removeItem$1(key, callback) {
    var self = this;

    // Cast the key to a string, as that's all we can set as a key.
    if (typeof key !== 'string') {
        console.warn(key + ' used as a key, but it is not a string.');
        key = String(key);
    }

    var promise = new Promise$1(function (resolve, reject) {
        self.ready().then(function () {
            var dbInfo = self._dbInfo;
            dbInfo.db.transaction(function (t) {
                t.executeSql('DELETE FROM ' + dbInfo.storeName + ' WHERE key = ?', [key], function () {
                    resolve();
                }, function (t, error) {

                    reject(error);
                });
            });
        })["catch"](reject);
    });

    executeCallback(promise, callback);
    return promise;
}

// Deletes every item in the table.
// TODO: Find out if this resets the AUTO_INCREMENT number.
function clear$1(callback) {
    var self = this;

    var promise = new Promise$1(function (resolve, reject) {
        self.ready().then(function () {
            var dbInfo = self._dbInfo;
            dbInfo.db.transaction(function (t) {
                t.executeSql('DELETE FROM ' + dbInfo.storeName, [], function () {
                    resolve();
                }, function (t, error) {
                    reject(error);
                });
            });
        })["catch"](reject);
    });

    executeCallback(promise, callback);
    return promise;
}

// Does a simple `COUNT(key)` to get the number of items stored in
// localForage.
function length$1(callback) {
    var self = this;

    var promise = new Promise$1(function (resolve, reject) {
        self.ready().then(function () {
            var dbInfo = self._dbInfo;
            dbInfo.db.transaction(function (t) {
                // Ahhh, SQL makes this one soooooo easy.
                t.executeSql('SELECT COUNT(key) as c FROM ' + dbInfo.storeName, [], function (t, results) {
                    var result = results.rows.item(0).c;

                    resolve(result);
                }, function (t, error) {

                    reject(error);
                });
            });
        })["catch"](reject);
    });

    executeCallback(promise, callback);
    return promise;
}

// Return the key located at key index X; essentially gets the key from a
// `WHERE id = ?`. This is the most efficient way I can think to implement
// this rarely-used (in my experience) part of the API, but it can seem
// inconsistent, because we do `INSERT OR REPLACE INTO` on `setItem()`, so
// the ID of each key will change every time it's updated. Perhaps a stored
// procedure for the `setItem()` SQL would solve this problem?
// TODO: Don't change ID on `setItem()`.
function key$1(n, callback) {
    var self = this;

    var promise = new Promise$1(function (resolve, reject) {
        self.ready().then(function () {
            var dbInfo = self._dbInfo;
            dbInfo.db.transaction(function (t) {
                t.executeSql('SELECT key FROM ' + dbInfo.storeName + ' WHERE id = ? LIMIT 1', [n + 1], function (t, results) {
                    var result = results.rows.length ? results.rows.item(0).key : null;
                    resolve(result);
                }, function (t, error) {
                    reject(error);
                });
            });
        })["catch"](reject);
    });

    executeCallback(promise, callback);
    return promise;
}

function keys$1(callback) {
    var self = this;

    var promise = new Promise$1(function (resolve, reject) {
        self.ready().then(function () {
            var dbInfo = self._dbInfo;
            dbInfo.db.transaction(function (t) {
                t.executeSql('SELECT key FROM ' + dbInfo.storeName, [], function (t, results) {
                    var keys = [];

                    for (var i = 0; i < results.rows.length; i++) {
                        keys.push(results.rows.item(i).key);
                    }

                    resolve(keys);
                }, function (t, error) {

                    reject(error);
                });
            });
        })["catch"](reject);
    });

    executeCallback(promise, callback);
    return promise;
}

var webSQLStorage = {
    _driver: 'webSQLStorage',
    _initStorage: _initStorage$1,
    iterate: iterate$1,
    getItem: getItem$1,
    setItem: setItem$1,
    removeItem: removeItem$1,
    clear: clear$1,
    length: length$1,
    key: key$1,
    keys: keys$1
};

// Config the localStorage backend, using options set in the config.
function _initStorage$2(options) {
    var self = this;
    var dbInfo = {};
    if (options) {
        for (var i in options) {
            dbInfo[i] = options[i];
        }
    }

    dbInfo.keyPrefix = dbInfo.name + '/';

    if (dbInfo.storeName !== self._defaultConfig.storeName) {
        dbInfo.keyPrefix += dbInfo.storeName + '/';
    }

    self._dbInfo = dbInfo;
    dbInfo.serializer = localforageSerializer;

    return Promise$1.resolve();
}

// Remove all keys from the datastore, effectively destroying all data in
// the app's key/value store!
function clear$2(callback) {
    var self = this;
    var promise = self.ready().then(function () {
        var keyPrefix = self._dbInfo.keyPrefix;

        for (var i = localStorage.length - 1; i >= 0; i--) {
            var key = localStorage.key(i);

            if (key.indexOf(keyPrefix) === 0) {
                localStorage.removeItem(key);
            }
        }
    });

    executeCallback(promise, callback);
    return promise;
}

// Retrieve an item from the store. Unlike the original async_storage
// library in Gaia, we don't modify return values at all. If a key's value
// is `undefined`, we pass that value to the callback function.
function getItem$2(key, callback) {
    var self = this;

    // Cast the key to a string, as that's all we can set as a key.
    if (typeof key !== 'string') {
        console.warn(key + ' used as a key, but it is not a string.');
        key = String(key);
    }

    var promise = self.ready().then(function () {
        var dbInfo = self._dbInfo;
        var result = localStorage.getItem(dbInfo.keyPrefix + key);

        // If a result was found, parse it from the serialized
        // string into a JS object. If result isn't truthy, the key
        // is likely undefined and we'll pass it straight to the
        // callback.
        if (result) {
            result = dbInfo.serializer.deserialize(result);
        }

        return result;
    });

    executeCallback(promise, callback);
    return promise;
}

// Iterate over all items in the store.
function iterate$2(iterator, callback) {
    var self = this;

    var promise = self.ready().then(function () {
        var dbInfo = self._dbInfo;
        var keyPrefix = dbInfo.keyPrefix;
        var keyPrefixLength = keyPrefix.length;
        var length = localStorage.length;

        // We use a dedicated iterator instead of the `i` variable below
        // so other keys we fetch in localStorage aren't counted in
        // the `iterationNumber` argument passed to the `iterate()`
        // callback.
        //
        // See: github.com/mozilla/localForage/pull/435#discussion_r38061530
        var iterationNumber = 1;

        for (var i = 0; i < length; i++) {
            var key = localStorage.key(i);
            if (key.indexOf(keyPrefix) !== 0) {
                continue;
            }
            var value = localStorage.getItem(key);

            // If a result was found, parse it from the serialized
            // string into a JS object. If result isn't truthy, the
            // key is likely undefined and we'll pass it straight
            // to the iterator.
            if (value) {
                value = dbInfo.serializer.deserialize(value);
            }

            value = iterator(value, key.substring(keyPrefixLength), iterationNumber++);

            if (value !== void 0) {
                return value;
            }
        }
    });

    executeCallback(promise, callback);
    return promise;
}

// Same as localStorage's key() method, except takes a callback.
function key$2(n, callback) {
    var self = this;
    var promise = self.ready().then(function () {
        var dbInfo = self._dbInfo;
        var result;
        try {
            result = localStorage.key(n);
        } catch (error) {
            result = null;
        }

        // Remove the prefix from the key, if a key is found.
        if (result) {
            result = result.substring(dbInfo.keyPrefix.length);
        }

        return result;
    });

    executeCallback(promise, callback);
    return promise;
}

function keys$2(callback) {
    var self = this;
    var promise = self.ready().then(function () {
        var dbInfo = self._dbInfo;
        var length = localStorage.length;
        var keys = [];

        for (var i = 0; i < length; i++) {
            if (localStorage.key(i).indexOf(dbInfo.keyPrefix) === 0) {
                keys.push(localStorage.key(i).substring(dbInfo.keyPrefix.length));
            }
        }

        return keys;
    });

    executeCallback(promise, callback);
    return promise;
}

// Supply the number of keys in the datastore to the callback function.
function length$2(callback) {
    var self = this;
    var promise = self.keys().then(function (keys) {
        return keys.length;
    });

    executeCallback(promise, callback);
    return promise;
}

// Remove an item from the store, nice and simple.
function removeItem$2(key, callback) {
    var self = this;

    // Cast the key to a string, as that's all we can set as a key.
    if (typeof key !== 'string') {
        console.warn(key + ' used as a key, but it is not a string.');
        key = String(key);
    }

    var promise = self.ready().then(function () {
        var dbInfo = self._dbInfo;
        localStorage.removeItem(dbInfo.keyPrefix + key);
    });

    executeCallback(promise, callback);
    return promise;
}

// Set a key's value and run an optional callback once the value is set.
// Unlike Gaia's implementation, the callback function is passed the value,
// in case you want to operate on that value only after you're sure it
// saved, or something like that.
function setItem$2(key, value, callback) {
    var self = this;

    // Cast the key to a string, as that's all we can set as a key.
    if (typeof key !== 'string') {
        console.warn(key + ' used as a key, but it is not a string.');
        key = String(key);
    }

    var promise = self.ready().then(function () {
        // Convert undefined values to null.
        // https://github.com/mozilla/localForage/pull/42
        if (value === undefined) {
            value = null;
        }

        // Save the original value to pass to the callback.
        var originalValue = value;

        return new Promise$1(function (resolve, reject) {
            var dbInfo = self._dbInfo;
            dbInfo.serializer.serialize(value, function (value, error) {
                if (error) {
                    reject(error);
                } else {
                    try {
                        localStorage.setItem(dbInfo.keyPrefix + key, value);
                        resolve(originalValue);
                    } catch (e) {
                        // localStorage capacity exceeded.
                        // TODO: Make this a specific error/event.
                        if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
                            reject(e);
                        }
                        reject(e);
                    }
                }
            });
        });
    });

    executeCallback(promise, callback);
    return promise;
}

var localStorageWrapper = {
    _driver: 'localStorageWrapper',
    _initStorage: _initStorage$2,
    // Default API, from Gaia/localStorage.
    iterate: iterate$2,
    getItem: getItem$2,
    setItem: setItem$2,
    removeItem: removeItem$2,
    clear: clear$2,
    length: length$2,
    key: key$2,
    keys: keys$2
};

// Custom drivers are stored here when `defineDriver()` is called.
// They are shared across all instances of localForage.
var CustomDrivers = {};

var DriverType = {
    INDEXEDDB: 'asyncStorage',
    LOCALSTORAGE: 'localStorageWrapper',
    WEBSQL: 'webSQLStorage'
};

var DefaultDriverOrder = [DriverType.INDEXEDDB, DriverType.WEBSQL, DriverType.LOCALSTORAGE];

var LibraryMethods = ['clear', 'getItem', 'iterate', 'key', 'keys', 'length', 'removeItem', 'setItem'];

var DefaultConfig = {
    description: '',
    driver: DefaultDriverOrder.slice(),
    name: 'localforage',
    // Default DB size is _JUST UNDER_ 5MB, as it's the highest size
    // we can use without a prompt.
    size: 4980736,
    storeName: 'keyvaluepairs',
    version: 1.0
};

var driverSupport = {};
// Check to see if IndexedDB is available and if it is the latest
// implementation; it's our preferred backend library. We use "_spec_test"
// as the name of the database because it's not the one we'll operate on,
// but it's useful to make sure its using the right spec.
// See: https://github.com/mozilla/localForage/issues/128
driverSupport[DriverType.INDEXEDDB] = isIndexedDBValid();

driverSupport[DriverType.WEBSQL] = isWebSQLValid();

driverSupport[DriverType.LOCALSTORAGE] = isLocalStorageValid();

var isArray = Array.isArray || function (arg) {
    return Object.prototype.toString.call(arg) === '[object Array]';
};

function callWhenReady(localForageInstance, libraryMethod) {
    localForageInstance[libraryMethod] = function () {
        var _args = arguments;
        return localForageInstance.ready().then(function () {
            return localForageInstance[libraryMethod].apply(localForageInstance, _args);
        });
    };
}

function extend() {
    for (var i = 1; i < arguments.length; i++) {
        var arg = arguments[i];

        if (arg) {
            for (var key in arg) {
                if (arg.hasOwnProperty(key)) {
                    if (isArray(arg[key])) {
                        arguments[0][key] = arg[key].slice();
                    } else {
                        arguments[0][key] = arg[key];
                    }
                }
            }
        }
    }

    return arguments[0];
}

function isLibraryDriver(driverName) {
    for (var driver in DriverType) {
        if (DriverType.hasOwnProperty(driver) && DriverType[driver] === driverName) {
            return true;
        }
    }

    return false;
}

var LocalForage = function () {
    function LocalForage(options) {
        _classCallCheck(this, LocalForage);

        this.INDEXEDDB = DriverType.INDEXEDDB;
        this.LOCALSTORAGE = DriverType.LOCALSTORAGE;
        this.WEBSQL = DriverType.WEBSQL;

        this._defaultConfig = extend({}, DefaultConfig);
        this._config = extend({}, this._defaultConfig, options);
        this._driverSet = null;
        this._initDriver = null;
        this._ready = false;
        this._dbInfo = null;

        this._wrapLibraryMethodsWithReady();
        this.setDriver(this._config.driver)["catch"](function () {});
    }

    // Set any config values for localForage; can be called anytime before
    // the first API call (e.g. `getItem`, `setItem`).
    // We loop through options so we don't overwrite existing config
    // values.


    LocalForage.prototype.config = function config(options) {
        // If the options argument is an object, we use it to set values.
        // Otherwise, we return either a specified config value or all
        // config values.
        if ((typeof options === 'undefined' ? 'undefined' : _typeof(options)) === 'object') {
            // If localforage is ready and fully initialized, we can't set
            // any new configuration values. Instead, we return an error.
            if (this._ready) {
                return new Error("Can't call config() after localforage " + 'has been used.');
            }

            for (var i in options) {
                if (i === 'storeName') {
                    options[i] = options[i].replace(/\W/g, '_');
                }

                if (i === 'version' && typeof options[i] !== 'number') {
                    return new Error('Database version must be a number.');
                }

                this._config[i] = options[i];
            }

            // after all config options are set and
            // the driver option is used, try setting it
            if ('driver' in options && options.driver) {
                return this.setDriver(this._config.driver);
            }

            return true;
        } else if (typeof options === 'string') {
            return this._config[options];
        } else {
            return this._config;
        }
    };

    // Used to define a custom driver, shared across all instances of
    // localForage.


    LocalForage.prototype.defineDriver = function defineDriver(driverObject, callback, errorCallback) {
        var promise = new Promise$1(function (resolve, reject) {
            try {
                var driverName = driverObject._driver;
                var complianceError = new Error('Custom driver not compliant; see ' + 'https://mozilla.github.io/localForage/#definedriver');
                var namingError = new Error('Custom driver name already in use: ' + driverObject._driver);

                // A driver name should be defined and not overlap with the
                // library-defined, default drivers.
                if (!driverObject._driver) {
                    reject(complianceError);
                    return;
                }
                if (isLibraryDriver(driverObject._driver)) {
                    reject(namingError);
                    return;
                }

                var customDriverMethods = LibraryMethods.concat('_initStorage');
                for (var i = 0; i < customDriverMethods.length; i++) {
                    var customDriverMethod = customDriverMethods[i];
                    if (!customDriverMethod || !driverObject[customDriverMethod] || typeof driverObject[customDriverMethod] !== 'function') {
                        reject(complianceError);
                        return;
                    }
                }

                var supportPromise = Promise$1.resolve(true);
                if ('_support' in driverObject) {
                    if (driverObject._support && typeof driverObject._support === 'function') {
                        supportPromise = driverObject._support();
                    } else {
                        supportPromise = Promise$1.resolve(!!driverObject._support);
                    }
                }

                supportPromise.then(function (supportResult) {
                    driverSupport[driverName] = supportResult;
                    CustomDrivers[driverName] = driverObject;
                    resolve();
                }, reject);
            } catch (e) {
                reject(e);
            }
        });

        executeTwoCallbacks(promise, callback, errorCallback);
        return promise;
    };

    LocalForage.prototype.driver = function driver() {
        return this._driver || null;
    };

    LocalForage.prototype.getDriver = function getDriver(driverName, callback, errorCallback) {
        var self = this;
        var getDriverPromise = Promise$1.resolve().then(function () {
            if (isLibraryDriver(driverName)) {
                switch (driverName) {
                    case self.INDEXEDDB:
                        return asyncStorage;
                    case self.LOCALSTORAGE:
                        return localStorageWrapper;
                    case self.WEBSQL:
                        return webSQLStorage;
                }
            } else if (CustomDrivers[driverName]) {
                return CustomDrivers[driverName];
            } else {
                throw new Error('Driver not found.');
            }
        });
        executeTwoCallbacks(getDriverPromise, callback, errorCallback);
        return getDriverPromise;
    };

    LocalForage.prototype.getSerializer = function getSerializer(callback) {
        var serializerPromise = Promise$1.resolve(localforageSerializer);
        executeTwoCallbacks(serializerPromise, callback);
        return serializerPromise;
    };

    LocalForage.prototype.ready = function ready(callback) {
        var self = this;

        var promise = self._driverSet.then(function () {
            if (self._ready === null) {
                self._ready = self._initDriver();
            }

            return self._ready;
        });

        executeTwoCallbacks(promise, callback, callback);
        return promise;
    };

    LocalForage.prototype.setDriver = function setDriver(drivers, callback, errorCallback) {
        var self = this;

        if (!isArray(drivers)) {
            drivers = [drivers];
        }

        var supportedDrivers = this._getSupportedDrivers(drivers);

        function setDriverToConfig() {
            self._config.driver = self.driver();
        }

        function extendSelfWithDriver(driver) {
            self._extend(driver);
            setDriverToConfig();

            self._ready = self._initStorage(self._config);
            return self._ready;
        }

        function initDriver(supportedDrivers) {
            return function () {
                var currentDriverIndex = 0;

                function driverPromiseLoop() {
                    while (currentDriverIndex < supportedDrivers.length) {
                        var driverName = supportedDrivers[currentDriverIndex];
                        currentDriverIndex++;

                        self._dbInfo = null;
                        self._ready = null;

                        return self.getDriver(driverName).then(extendSelfWithDriver)["catch"](driverPromiseLoop);
                    }

                    setDriverToConfig();
                    var error = new Error('No available storage method found.');
                    self._driverSet = Promise$1.reject(error);
                    return self._driverSet;
                }

                return driverPromiseLoop();
            };
        }

        // There might be a driver initialization in progress
        // so wait for it to finish in order to avoid a possible
        // race condition to set _dbInfo
        var oldDriverSetDone = this._driverSet !== null ? this._driverSet["catch"](function () {
            return Promise$1.resolve();
        }) : Promise$1.resolve();

        this._driverSet = oldDriverSetDone.then(function () {
            var driverName = supportedDrivers[0];
            self._dbInfo = null;
            self._ready = null;

            return self.getDriver(driverName).then(function (driver) {
                self._driver = driver._driver;
                setDriverToConfig();
                self._wrapLibraryMethodsWithReady();
                self._initDriver = initDriver(supportedDrivers);
            });
        })["catch"](function () {
            setDriverToConfig();
            var error = new Error('No available storage method found.');
            self._driverSet = Promise$1.reject(error);
            return self._driverSet;
        });

        executeTwoCallbacks(this._driverSet, callback, errorCallback);
        return this._driverSet;
    };

    LocalForage.prototype.supports = function supports(driverName) {
        return !!driverSupport[driverName];
    };

    LocalForage.prototype._extend = function _extend(libraryMethodsAndProperties) {
        extend(this, libraryMethodsAndProperties);
    };

    LocalForage.prototype._getSupportedDrivers = function _getSupportedDrivers(drivers) {
        var supportedDrivers = [];
        for (var i = 0, len = drivers.length; i < len; i++) {
            var driverName = drivers[i];
            if (this.supports(driverName)) {
                supportedDrivers.push(driverName);
            }
        }
        return supportedDrivers;
    };

    LocalForage.prototype._wrapLibraryMethodsWithReady = function _wrapLibraryMethodsWithReady() {
        // Add a stub for each driver API method that delays the call to the
        // corresponding driver method until localForage is ready. These stubs
        // will be replaced by the driver methods as soon as the driver is
        // loaded, so there is no performance impact.
        for (var i = 0; i < LibraryMethods.length; i++) {
            callWhenReady(this, LibraryMethods[i]);
        }
    };

    LocalForage.prototype.createInstance = function createInstance(options) {
        return new LocalForage(options);
    };

    return LocalForage;
}();

// The actual localForage object that we expose as a module or via a
// global. It's extended by pulling in one of our other libraries.


var localforage_js = new LocalForage();

module.exports = localforage_js;

},{"3":3}]},{},[4])(4)
});
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],25:[function(require,module,exports){
var NedbDatastore = require('nedb')
var thenify = require('thenify')

function fromInstance(nedbInstance) {
	var newDB = { nedb: nedbInstance }

	var methods = [ 'loadDatabase', 'insert', 'find', 'findOne', 'count', 'update', 'remove', 'ensureIndex', 'removeIndex' ]
	for (var i = 0; i < methods.length; ++i) {
		var m = methods[i]
		newDB[m] = thenify(nedbInstance[m].bind(nedbInstance))
	}

	newDB.cfind = function(query, projections) {
		var cursor = nedbInstance.find(query, projections)
		cursor.exec = thenify(cursor.exec.bind(cursor))
		return cursor
	}

	newDB.cfindOne = function(query, projections) {
		var cursor = nedbInstance.findOne(query, projections)
		cursor.exec = thenify(cursor.exec.bind(cursor))
		return cursor
	}

	newDB.ccount = function(query) {
		var cursor = nedbInstance.count(query)
		cursor.exec = thenify(cursor.exec.bind(cursor))
		return cursor
	}

	return newDB
}

function datastore(options) {
	var nedbInstance = new NedbDatastore(options)
	return fromInstance(nedbInstance)
}

// so that import { datastore } still works:
datastore.datastore = datastore
datastore.fromInstance = fromInstance

module.exports = datastore

},{"nedb":28,"thenify":41}],26:[function(require,module,exports){
/**
 * Specific customUtils for the browser, where we don't have access to the Crypto and Buffer modules
 */

/**
 * Taken from the crypto-browserify module
 * https://github.com/dominictarr/crypto-browserify
 * NOTE: Math.random() does not guarantee "cryptographic quality" but we actually don't need it
 */
function randomBytes (size) {
  var bytes = new Array(size);
  var r;

  for (var i = 0, r; i < size; i++) {
    if ((i & 0x03) == 0) r = Math.random() * 0x100000000;
    bytes[i] = r >>> ((i & 0x03) << 3) & 0xff;
  }

  return bytes;
}


/**
 * Taken from the base64-js module
 * https://github.com/beatgammit/base64-js/
 */
function byteArrayToBase64 (uint8) {
  var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
    , extraBytes = uint8.length % 3   // if we have 1 byte left, pad 2 bytes
    , output = ""
    , temp, length, i;

  function tripletToBase64 (num) {
    return lookup[num >> 18 & 0x3F] + lookup[num >> 12 & 0x3F] + lookup[num >> 6 & 0x3F] + lookup[num & 0x3F];
  };

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
    temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2]);
    output += tripletToBase64(temp);
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  switch (extraBytes) {
    case 1:
      temp = uint8[uint8.length - 1];
      output += lookup[temp >> 2];
      output += lookup[(temp << 4) & 0x3F];
      output += '==';
      break;
    case 2:
      temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1]);
      output += lookup[temp >> 10];
      output += lookup[(temp >> 4) & 0x3F];
      output += lookup[(temp << 2) & 0x3F];
      output += '=';
      break;
  }

  return output;
}


/**
 * Return a random alphanumerical string of length len
 * There is a very small probability (less than 1/1,000,000) for the length to be less than len
 * (il the base64 conversion yields too many pluses and slashes) but
 * that's not an issue here
 * The probability of a collision is extremely small (need 3*10^12 documents to have one chance in a million of a collision)
 * See http://en.wikipedia.org/wiki/Birthday_problem
 */
function uid (len) {
  return byteArrayToBase64(randomBytes(Math.ceil(Math.max(8, len * 2)))).replace(/[+\/]/g, '').slice(0, len);
}



module.exports.uid = uid;

},{}],27:[function(require,module,exports){
/**
 * Way data is stored for this database
 * For a Node.js/Node Webkit database it's the file system
 * For a browser-side database it's localforage, which uses the best backend available (IndexedDB then WebSQL then localStorage)
 *
 * This version is the browser version
 */

var localforage = require('localforage')

// Configure localforage to display NeDB name for now. Would be a good idea to let user use his own app name
localforage.config({
  name: 'NeDB'
, storeName: 'nedbdata'
});


function exists (filename, callback) {
  localforage.getItem(filename, function (err, value) {
    if (value !== null) {   // Even if value is undefined, localforage returns null
      return callback(true);
    } else {
      return callback(false);
    }
  });
}


function rename (filename, newFilename, callback) {
  localforage.getItem(filename, function (err, value) {
    if (value === null) {
      localforage.removeItem(newFilename, function () { return callback(); });
    } else {
      localforage.setItem(newFilename, value, function () {
        localforage.removeItem(filename, function () { return callback(); });
      });
    }
  });
}


function writeFile (filename, contents, options, callback) {
  // Options do not matter in browser setup
  if (typeof options === 'function') { callback = options; }
  localforage.setItem(filename, contents, function () { return callback(); });
}


function appendFile (filename, toAppend, options, callback) {
  // Options do not matter in browser setup
  if (typeof options === 'function') { callback = options; }

  localforage.getItem(filename, function (err, contents) {
    contents = contents || '';
    contents += toAppend;
    localforage.setItem(filename, contents, function () { return callback(); });
  });
}


function readFile (filename, options, callback) {
  // Options do not matter in browser setup
  if (typeof options === 'function') { callback = options; }
  localforage.getItem(filename, function (err, contents) { return callback(null, contents || ''); });
}


function unlink (filename, callback) {
  localforage.removeItem(filename, function () { return callback(); });
}


// Nothing to do, no directories will be used on the browser
function mkdirp (dir, callback) {
  return callback();
}


// Nothing to do, no data corruption possible in the brower
function ensureDatafileIntegrity (filename, callback) {
  return callback(null);
}


// Interface
module.exports.exists = exists;
module.exports.rename = rename;
module.exports.writeFile = writeFile;
module.exports.crashSafeWriteFile = writeFile;   // No need for a crash safe function in the browser
module.exports.appendFile = appendFile;
module.exports.readFile = readFile;
module.exports.unlink = unlink;
module.exports.mkdirp = mkdirp;
module.exports.ensureDatafileIntegrity = ensureDatafileIntegrity;


},{"localforage":24}],28:[function(require,module,exports){
var Datastore = require('./lib/datastore');

module.exports = Datastore;

},{"./lib/datastore":30}],29:[function(require,module,exports){
/**
 * Manage access to data, be it to find, update or remove it
 */
var model = require('./model')
  , _ = require('underscore')
  ;



/**
 * Create a new cursor for this collection
 * @param {Datastore} db - The datastore this cursor is bound to
 * @param {Query} query - The query this cursor will operate on
 * @param {Function} execFn - Handler to be executed after cursor has found the results and before the callback passed to find/findOne/update/remove
 */
function Cursor (db, query, execFn) {
  this.db = db;
  this.query = query || {};
  if (execFn) { this.execFn = execFn; }
}


/**
 * Set a limit to the number of results
 */
Cursor.prototype.limit = function(limit) {
  this._limit = limit;
  return this;
};


/**
 * Skip a the number of results
 */
Cursor.prototype.skip = function(skip) {
  this._skip = skip;
  return this;
};


/**
 * Sort results of the query
 * @param {SortQuery} sortQuery - SortQuery is { field: order }, field can use the dot-notation, order is 1 for ascending and -1 for descending
 */
Cursor.prototype.sort = function(sortQuery) {
  this._sort = sortQuery;
  return this;
};


/**
 * Add the use of a projection
 * @param {Object} projection - MongoDB-style projection. {} means take all fields. Then it's { key1: 1, key2: 1 } to take only key1 and key2
 *                              { key1: 0, key2: 0 } to omit only key1 and key2. Except _id, you can't mix takes and omits
 */
Cursor.prototype.projection = function(projection) {
  this._projection = projection;
  return this;
};


/**
 * Apply the projection
 */
Cursor.prototype.project = function (candidates) {
  var res = [], self = this
    , keepId, action, keys
    ;

  if (this._projection === undefined || Object.keys(this._projection).length === 0) {
    return candidates;
  }

  keepId = this._projection._id === 0 ? false : true;
  this._projection = _.omit(this._projection, '_id');

  // Check for consistency
  keys = Object.keys(this._projection);
  keys.forEach(function (k) {
    if (action !== undefined && self._projection[k] !== action) { throw new Error("Can't both keep and omit fields except for _id"); }
    action = self._projection[k];
  });

  // Do the actual projection
  candidates.forEach(function (candidate) {
    var toPush;
    if (action === 1) {   // pick-type projection
      toPush = { $set: {} };
      keys.forEach(function (k) {
        toPush.$set[k] = model.getDotValue(candidate, k);
        if (toPush.$set[k] === undefined) { delete toPush.$set[k]; }
      });
      toPush = model.modify({}, toPush);
    } else {   // omit-type projection
      toPush = { $unset: {} };
      keys.forEach(function (k) { toPush.$unset[k] = true });
      toPush = model.modify(candidate, toPush);
    }
    if (keepId) {
      toPush._id = candidate._id;
    } else {
      delete toPush._id;
    }
    res.push(toPush);
  });

  return res;
};


/**
 * Get all matching elements
 * Will return pointers to matched elements (shallow copies), returning full copies is the role of find or findOne
 * This is an internal function, use exec which uses the executor
 *
 * @param {Function} callback - Signature: err, results
 */
Cursor.prototype._exec = function(_callback) {
  var res = [], added = 0, skipped = 0, self = this
    , error = null
    , i, keys, key
    ;

  function callback (error, res) {
    if (self.execFn) {
      return self.execFn(error, res, _callback);
    } else {
      return _callback(error, res);
    }
  }

  this.db.getCandidates(this.query, function (err, candidates) {
    if (err) { return callback(err); }

    try {
      for (i = 0; i < candidates.length; i += 1) {
        if (model.match(candidates[i], self.query)) {
          // If a sort is defined, wait for the results to be sorted before applying limit and skip
          if (!self._sort) {
            if (self._skip && self._skip > skipped) {
              skipped += 1;
            } else {
              res.push(candidates[i]);
              added += 1;
              if (self._limit && self._limit <= added) { break; }
            }
          } else {
            res.push(candidates[i]);
          }
        }
      }
    } catch (err) {
      return callback(err);
    }

    // Apply all sorts
    if (self._sort) {
      keys = Object.keys(self._sort);

      // Sorting
      var criteria = [];
      for (i = 0; i < keys.length; i++) {
        key = keys[i];
        criteria.push({ key: key, direction: self._sort[key] });
      }
      res.sort(function(a, b) {
        var criterion, compare, i;
        for (i = 0; i < criteria.length; i++) {
          criterion = criteria[i];
          compare = criterion.direction * model.compareThings(model.getDotValue(a, criterion.key), model.getDotValue(b, criterion.key), self.db.compareStrings);
          if (compare !== 0) {
            return compare;
          }
        }
        return 0;
      });

      // Applying limit and skip
      var limit = self._limit || res.length
        , skip = self._skip || 0;

      res = res.slice(skip, skip + limit);
    }

    // Apply projection
    try {
      res = self.project(res);
    } catch (e) {
      error = e;
      res = undefined;
    }

    return callback(error, res);
  });
};

Cursor.prototype.exec = function () {
  this.db.executor.push({ this: this, fn: this._exec, arguments: arguments });
};



// Interface
module.exports = Cursor;

},{"./model":33,"underscore":42}],30:[function(require,module,exports){
var customUtils = require('./customUtils')
  , model = require('./model')
  , async = require('async')
  , Executor = require('./executor')
  , Index = require('./indexes')
  , util = require('util')
  , _ = require('underscore')
  , Persistence = require('./persistence')
  , Cursor = require('./cursor')
  ;


/**
 * Create a new collection
 * @param {String} options.filename Optional, datastore will be in-memory only if not provided
 * @param {Boolean} options.timestampData Optional, defaults to false. If set to true, createdAt and updatedAt will be created and populated automatically (if not specified by user)
 * @param {Boolean} options.inMemoryOnly Optional, defaults to false
 * @param {String} options.nodeWebkitAppName Optional, specify the name of your NW app if you want options.filename to be relative to the directory where
 *                                            Node Webkit stores application data such as cookies and local storage (the best place to store data in my opinion)
 * @param {Boolean} options.autoload Optional, defaults to false
 * @param {Function} options.onload Optional, if autoload is used this will be called after the load database with the error object as parameter. If you don't pass it the error will be thrown
 * @param {Function} options.afterSerialization/options.beforeDeserialization Optional, serialization hooks
 * @param {Number} options.corruptAlertThreshold Optional, threshold after which an alert is thrown if too much data is corrupt
 * @param {Function} options.compareStrings Optional, string comparison function that overrides default for sorting
 *
 * Event Emitter - Events
 * * compaction.done - Fired whenever a compaction operation was finished
 */
function Datastore (options) {
  var filename;

  // Retrocompatibility with v0.6 and before
  if (typeof options === 'string') {
    filename = options;
    this.inMemoryOnly = false;   // Default
  } else {
    options = options || {};
    filename = options.filename;
    this.inMemoryOnly = options.inMemoryOnly || false;
    this.autoload = options.autoload || false;
    this.timestampData = options.timestampData || false;
  }

  // Determine whether in memory or persistent
  if (!filename || typeof filename !== 'string' || filename.length === 0) {
    this.filename = null;
    this.inMemoryOnly = true;
  } else {
    this.filename = filename;
  }

  // String comparison function
  this.compareStrings = options.compareStrings;

  // Persistence handling
  this.persistence = new Persistence({ db: this, nodeWebkitAppName: options.nodeWebkitAppName
                                      , afterSerialization: options.afterSerialization
                                      , beforeDeserialization: options.beforeDeserialization
                                      , corruptAlertThreshold: options.corruptAlertThreshold
                                      });

  // This new executor is ready if we don't use persistence
  // If we do, it will only be ready once loadDatabase is called
  this.executor = new Executor();
  if (this.inMemoryOnly) { this.executor.ready = true; }

  // Indexed by field name, dot notation can be used
  // _id is always indexed and since _ids are generated randomly the underlying
  // binary is always well-balanced
  this.indexes = {};
  this.indexes._id = new Index({ fieldName: '_id', unique: true });
  this.ttlIndexes = {};

  // Queue a load of the database right away and call the onload handler
  // By default (no onload handler), if there is an error there, no operation will be possible so warn the user by throwing an exception
  if (this.autoload) { this.loadDatabase(options.onload || function (err) {
    if (err) { throw err; }
  }); }
}

util.inherits(Datastore, require('events').EventEmitter);


/**
 * Load the database from the datafile, and trigger the execution of buffered commands if any
 */
Datastore.prototype.loadDatabase = function () {
  this.executor.push({ this: this.persistence, fn: this.persistence.loadDatabase, arguments: arguments }, true);
};


/**
 * Get an array of all the data in the database
 */
Datastore.prototype.getAllData = function () {
  return this.indexes._id.getAll();
};


/**
 * Reset all currently defined indexes
 */
Datastore.prototype.resetIndexes = function (newData) {
  var self = this;

  Object.keys(this.indexes).forEach(function (i) {
    self.indexes[i].reset(newData);
  });
};


/**
 * Ensure an index is kept for this field. Same parameters as lib/indexes
 * For now this function is synchronous, we need to test how much time it takes
 * We use an async API for consistency with the rest of the code
 * @param {String} options.fieldName
 * @param {Boolean} options.unique
 * @param {Boolean} options.sparse
 * @param {Number} options.expireAfterSeconds - Optional, if set this index becomes a TTL index (only works on Date fields, not arrays of Date)
 * @param {Function} cb Optional callback, signature: err
 */
Datastore.prototype.ensureIndex = function (options, cb) {
  var err
    , callback = cb || function () {};

  options = options || {};

  if (!options.fieldName) {
    err = new Error("Cannot create an index without a fieldName");
    err.missingFieldName = true;
    return callback(err);
  }
  if (this.indexes[options.fieldName]) { return callback(null); }

  this.indexes[options.fieldName] = new Index(options);
  if (options.expireAfterSeconds !== undefined) { this.ttlIndexes[options.fieldName] = options.expireAfterSeconds; }   // With this implementation index creation is not necessary to ensure TTL but we stick with MongoDB's API here

  try {
    this.indexes[options.fieldName].insert(this.getAllData());
  } catch (e) {
    delete this.indexes[options.fieldName];
    return callback(e);
  }

  // We may want to force all options to be persisted including defaults, not just the ones passed the index creation function
  this.persistence.persistNewState([{ $$indexCreated: options }], function (err) {
    if (err) { return callback(err); }
    return callback(null);
  });
};


/**
 * Remove an index
 * @param {String} fieldName
 * @param {Function} cb Optional callback, signature: err
 */
Datastore.prototype.removeIndex = function (fieldName, cb) {
  var callback = cb || function () {};

  delete this.indexes[fieldName];

  this.persistence.persistNewState([{ $$indexRemoved: fieldName }], function (err) {
    if (err) { return callback(err); }
    return callback(null);
  });
};


/**
 * Add one or several document(s) to all indexes
 */
Datastore.prototype.addToIndexes = function (doc) {
  var i, failingIndex, error
    , keys = Object.keys(this.indexes)
    ;

  for (i = 0; i < keys.length; i += 1) {
    try {
      this.indexes[keys[i]].insert(doc);
    } catch (e) {
      failingIndex = i;
      error = e;
      break;
    }
  }

  // If an error happened, we need to rollback the insert on all other indexes
  if (error) {
    for (i = 0; i < failingIndex; i += 1) {
      this.indexes[keys[i]].remove(doc);
    }

    throw error;
  }
};


/**
 * Remove one or several document(s) from all indexes
 */
Datastore.prototype.removeFromIndexes = function (doc) {
  var self = this;

  Object.keys(this.indexes).forEach(function (i) {
    self.indexes[i].remove(doc);
  });
};


/**
 * Update one or several documents in all indexes
 * To update multiple documents, oldDoc must be an array of { oldDoc, newDoc } pairs
 * If one update violates a constraint, all changes are rolled back
 */
Datastore.prototype.updateIndexes = function (oldDoc, newDoc) {
  var i, failingIndex, error
    , keys = Object.keys(this.indexes)
    ;

  for (i = 0; i < keys.length; i += 1) {
    try {
      this.indexes[keys[i]].update(oldDoc, newDoc);
    } catch (e) {
      failingIndex = i;
      error = e;
      break;
    }
  }

  // If an error happened, we need to rollback the update on all other indexes
  if (error) {
    for (i = 0; i < failingIndex; i += 1) {
      this.indexes[keys[i]].revertUpdate(oldDoc, newDoc);
    }

    throw error;
  }
};


/**
 * Return the list of candidates for a given query
 * Crude implementation for now, we return the candidates given by the first usable index if any
 * We try the following query types, in this order: basic match, $in match, comparison match
 * One way to make it better would be to enable the use of multiple indexes if the first usable index
 * returns too much data. I may do it in the future.
 *
 * Returned candidates will be scanned to find and remove all expired documents
 *
 * @param {Query} query
 * @param {Boolean} dontExpireStaleDocs Optional, defaults to false, if true don't remove stale docs. Useful for the remove function which shouldn't be impacted by expirations
 * @param {Function} callback Signature err, docs
 */
Datastore.prototype.getCandidates = function (query, dontExpireStaleDocs, callback) {
  var indexNames = Object.keys(this.indexes)
    , self = this
    , usableQueryKeys;

  if (typeof dontExpireStaleDocs === 'function') {
    callback = dontExpireStaleDocs;
    dontExpireStaleDocs = false;
  }

  async.waterfall([
  // STEP 1: get candidates list by checking indexes from most to least frequent usecase
  function (cb) {
    // For a basic match
    usableQueryKeys = [];
    Object.keys(query).forEach(function (k) {
      if (typeof query[k] === 'string' || typeof query[k] === 'number' || typeof query[k] === 'boolean' || util.isDate(query[k]) || query[k] === null) {
        usableQueryKeys.push(k);
      }
    });
    usableQueryKeys = _.intersection(usableQueryKeys, indexNames);
    if (usableQueryKeys.length > 0) {
      return cb(null, self.indexes[usableQueryKeys[0]].getMatching(query[usableQueryKeys[0]]));
    }

    // For a $in match
    usableQueryKeys = [];
    Object.keys(query).forEach(function (k) {
      if (query[k] && query[k].hasOwnProperty('$in')) {
        usableQueryKeys.push(k);
      }
    });
    usableQueryKeys = _.intersection(usableQueryKeys, indexNames);
    if (usableQueryKeys.length > 0) {
      return cb(null, self.indexes[usableQueryKeys[0]].getMatching(query[usableQueryKeys[0]].$in));
    }

    // For a comparison match
    usableQueryKeys = [];
    Object.keys(query).forEach(function (k) {
      if (query[k] && (query[k].hasOwnProperty('$lt') || query[k].hasOwnProperty('$lte') || query[k].hasOwnProperty('$gt') || query[k].hasOwnProperty('$gte'))) {
        usableQueryKeys.push(k);
      }
    });
    usableQueryKeys = _.intersection(usableQueryKeys, indexNames);
    if (usableQueryKeys.length > 0) {
      return cb(null, self.indexes[usableQueryKeys[0]].getBetweenBounds(query[usableQueryKeys[0]]));
    }

    // By default, return all the DB data
    return cb(null, self.getAllData());
  }
  // STEP 2: remove all expired documents
  , function (docs) {
    if (dontExpireStaleDocs) { return callback(null, docs); }

    var expiredDocsIds = [], validDocs = [], ttlIndexesFieldNames = Object.keys(self.ttlIndexes);

    docs.forEach(function (doc) {
      var valid = true;
      ttlIndexesFieldNames.forEach(function (i) {
        if (doc[i] !== undefined && util.isDate(doc[i]) && Date.now() > doc[i].getTime() + self.ttlIndexes[i] * 1000) {
          valid = false;
        }
      });
      if (valid) { validDocs.push(doc); } else { expiredDocsIds.push(doc._id); }
    });

    async.eachSeries(expiredDocsIds, function (_id, cb) {
      self._remove({ _id: _id }, {}, function (err) {
        if (err) { return callback(err); }
        return cb();
      });
    }, function (err) {
      return callback(null, validDocs);
    });
  }]);
};


/**
 * Insert a new document
 * @param {Function} cb Optional callback, signature: err, insertedDoc
 *
 * @api private Use Datastore.insert which has the same signature
 */
Datastore.prototype._insert = function (newDoc, cb) {
  var callback = cb || function () {}
    , preparedDoc
    ;

  try {
    preparedDoc = this.prepareDocumentForInsertion(newDoc)
    this._insertInCache(preparedDoc);
  } catch (e) {
    return callback(e);
  }

  this.persistence.persistNewState(util.isArray(preparedDoc) ? preparedDoc : [preparedDoc], function (err) {
    if (err) { return callback(err); }
    return callback(null, model.deepCopy(preparedDoc));
  });
};

/**
 * Create a new _id that's not already in use
 */
Datastore.prototype.createNewId = function () {
  var tentativeId = customUtils.uid(16);
  // Try as many times as needed to get an unused _id. As explained in customUtils, the probability of this ever happening is extremely small, so this is O(1)
  if (this.indexes._id.getMatching(tentativeId).length > 0) {
    tentativeId = this.createNewId();
  }
  return tentativeId;
};

/**
 * Prepare a document (or array of documents) to be inserted in a database
 * Meaning adds _id and timestamps if necessary on a copy of newDoc to avoid any side effect on user input
 * @api private
 */
Datastore.prototype.prepareDocumentForInsertion = function (newDoc) {
  var preparedDoc, self = this;

  if (util.isArray(newDoc)) {
    preparedDoc = [];
    newDoc.forEach(function (doc) { preparedDoc.push(self.prepareDocumentForInsertion(doc)); });
  } else {
    preparedDoc = model.deepCopy(newDoc);
    if (preparedDoc._id === undefined) { preparedDoc._id = this.createNewId(); }
    var now = new Date();
    if (this.timestampData && preparedDoc.createdAt === undefined) { preparedDoc.createdAt = now; }
    if (this.timestampData && preparedDoc.updatedAt === undefined) { preparedDoc.updatedAt = now; }
    model.checkObject(preparedDoc);
  }

  return preparedDoc;
};

/**
 * If newDoc is an array of documents, this will insert all documents in the cache
 * @api private
 */
Datastore.prototype._insertInCache = function (preparedDoc) {
  if (util.isArray(preparedDoc)) {
    this._insertMultipleDocsInCache(preparedDoc);
  } else {
    this.addToIndexes(preparedDoc);
  }
};

/**
 * If one insertion fails (e.g. because of a unique constraint), roll back all previous
 * inserts and throws the error
 * @api private
 */
Datastore.prototype._insertMultipleDocsInCache = function (preparedDocs) {
  var i, failingI, error;

  for (i = 0; i < preparedDocs.length; i += 1) {
    try {
      this.addToIndexes(preparedDocs[i]);
    } catch (e) {
      error = e;
      failingI = i;
      break;
    }
  }

  if (error) {
    for (i = 0; i < failingI; i += 1) {
      this.removeFromIndexes(preparedDocs[i]);
    }

    throw error;
  }
};

Datastore.prototype.insert = function () {
  this.executor.push({ this: this, fn: this._insert, arguments: arguments });
};


/**
 * Count all documents matching the query
 * @param {Object} query MongoDB-style query
 */
Datastore.prototype.count = function(query, callback) {
  var cursor = new Cursor(this, query, function(err, docs, callback) {
    if (err) { return callback(err); }
    return callback(null, docs.length);
  });

  if (typeof callback === 'function') {
    cursor.exec(callback);
  } else {
    return cursor;
  }
};


/**
 * Find all documents matching the query
 * If no callback is passed, we return the cursor so that user can limit, skip and finally exec
 * @param {Object} query MongoDB-style query
 * @param {Object} projection MongoDB-style projection
 */
Datastore.prototype.find = function (query, projection, callback) {
  switch (arguments.length) {
    case 1:
      projection = {};
      // callback is undefined, will return a cursor
      break;
    case 2:
      if (typeof projection === 'function') {
        callback = projection;
        projection = {};
      }   // If not assume projection is an object and callback undefined
      break;
  }

  var cursor = new Cursor(this, query, function(err, docs, callback) {
    var res = [], i;

    if (err) { return callback(err); }

    for (i = 0; i < docs.length; i += 1) {
      res.push(model.deepCopy(docs[i]));
    }
    return callback(null, res);
  });

  cursor.projection(projection);
  if (typeof callback === 'function') {
    cursor.exec(callback);
  } else {
    return cursor;
  }
};


/**
 * Find one document matching the query
 * @param {Object} query MongoDB-style query
 * @param {Object} projection MongoDB-style projection
 */
Datastore.prototype.findOne = function (query, projection, callback) {
  switch (arguments.length) {
    case 1:
      projection = {};
      // callback is undefined, will return a cursor
      break;
    case 2:
      if (typeof projection === 'function') {
        callback = projection;
        projection = {};
      }   // If not assume projection is an object and callback undefined
      break;
  }

  var cursor = new Cursor(this, query, function(err, docs, callback) {
    if (err) { return callback(err); }
    if (docs.length === 1) {
      return callback(null, model.deepCopy(docs[0]));
    } else {
      return callback(null, null);
    }
  });

  cursor.projection(projection).limit(1);
  if (typeof callback === 'function') {
    cursor.exec(callback);
  } else {
    return cursor;
  }
};


/**
 * Update all docs matching query
 * @param {Object} query
 * @param {Object} updateQuery
 * @param {Object} options Optional options
 *                 options.multi If true, can update multiple documents (defaults to false)
 *                 options.upsert If true, document is inserted if the query doesn't match anything
 *                 options.returnUpdatedDocs Defaults to false, if true return as third argument the array of updated matched documents (even if no change actually took place)
 * @param {Function} cb Optional callback, signature: (err, numAffected, affectedDocuments, upsert)
 *                      If update was an upsert, upsert flag is set to true
 *                      affectedDocuments can be one of the following:
 *                        * For an upsert, the upserted document
 *                        * For an update with returnUpdatedDocs option false, null
 *                        * For an update with returnUpdatedDocs true and multi false, the updated document
 *                        * For an update with returnUpdatedDocs true and multi true, the array of updated documents
 *
 * WARNING: The API was changed between v1.7.4 and v1.8, for consistency and readability reasons. Prior and including to v1.7.4,
 *          the callback signature was (err, numAffected, updated) where updated was the updated document in case of an upsert
 *          or the array of updated documents for an update if the returnUpdatedDocs option was true. That meant that the type of
 *          affectedDocuments in a non multi update depended on whether there was an upsert or not, leaving only two ways for the
 *          user to check whether an upsert had occured: checking the type of affectedDocuments or running another find query on
 *          the whole dataset to check its size. Both options being ugly, the breaking change was necessary.
 *
 * @api private Use Datastore.update which has the same signature
 */
Datastore.prototype._update = function (query, updateQuery, options, cb) {
  var callback
    , self = this
    , numReplaced = 0
    , multi, upsert
    , i
    ;

  if (typeof options === 'function') { cb = options; options = {}; }
  callback = cb || function () {};
  multi = options.multi !== undefined ? options.multi : false;
  upsert = options.upsert !== undefined ? options.upsert : false;

  async.waterfall([
  function (cb) {   // If upsert option is set, check whether we need to insert the doc
    if (!upsert) { return cb(); }

    // Need to use an internal function not tied to the executor to avoid deadlock
    var cursor = new Cursor(self, query);
    cursor.limit(1)._exec(function (err, docs) {
      if (err) { return callback(err); }
      if (docs.length === 1) {
        return cb();
      } else {
        var toBeInserted;

        try {
          model.checkObject(updateQuery);
          // updateQuery is a simple object with no modifier, use it as the document to insert
          toBeInserted = updateQuery;
        } catch (e) {
          // updateQuery contains modifiers, use the find query as the base,
          // strip it from all operators and update it according to updateQuery
          try {
            toBeInserted = model.modify(model.deepCopy(query, true), updateQuery);
          } catch (err) {
            return callback(err);
          }
        }

        return self._insert(toBeInserted, function (err, newDoc) {
          if (err) { return callback(err); }
          return callback(null, 1, newDoc, true);
        });
      }
    });
  }
  , function () {   // Perform the update
    var modifiedDoc , modifications = [], createdAt;

    self.getCandidates(query, function (err, candidates) {
      if (err) { return callback(err); }

      // Preparing update (if an error is thrown here neither the datafile nor
      // the in-memory indexes are affected)
      try {
        for (i = 0; i < candidates.length; i += 1) {
          if (model.match(candidates[i], query) && (multi || numReplaced === 0)) {
            numReplaced += 1;
            if (self.timestampData) { createdAt = candidates[i].createdAt; }
            modifiedDoc = model.modify(candidates[i], updateQuery);
            if (self.timestampData) {
              modifiedDoc.createdAt = createdAt;
              modifiedDoc.updatedAt = new Date();
            }
            modifications.push({ oldDoc: candidates[i], newDoc: modifiedDoc });
          }
        }
      } catch (err) {
        return callback(err);
      }

      // Change the docs in memory
      try {
        self.updateIndexes(modifications);
      } catch (err) {
        return callback(err);
      }

      // Update the datafile
      var updatedDocs = _.pluck(modifications, 'newDoc');
      self.persistence.persistNewState(updatedDocs, function (err) {
        if (err) { return callback(err); }
        if (!options.returnUpdatedDocs) {
          return callback(null, numReplaced);
        } else {
          var updatedDocsDC = [];
          updatedDocs.forEach(function (doc) { updatedDocsDC.push(model.deepCopy(doc)); });
          if (! multi) { updatedDocsDC = updatedDocsDC[0]; }
          return callback(null, numReplaced, updatedDocsDC);
        }
      });
    });
  }]);
};

Datastore.prototype.update = function () {
  this.executor.push({ this: this, fn: this._update, arguments: arguments });
};


/**
 * Remove all docs matching the query
 * For now very naive implementation (similar to update)
 * @param {Object} query
 * @param {Object} options Optional options
 *                 options.multi If true, can update multiple documents (defaults to false)
 * @param {Function} cb Optional callback, signature: err, numRemoved
 *
 * @api private Use Datastore.remove which has the same signature
 */
Datastore.prototype._remove = function (query, options, cb) {
  var callback
    , self = this, numRemoved = 0, removedDocs = [], multi
    ;

  if (typeof options === 'function') { cb = options; options = {}; }
  callback = cb || function () {};
  multi = options.multi !== undefined ? options.multi : false;

  this.getCandidates(query, true, function (err, candidates) {
    if (err) { return callback(err); }

    try {
      candidates.forEach(function (d) {
        if (model.match(d, query) && (multi || numRemoved === 0)) {
          numRemoved += 1;
          removedDocs.push({ $$deleted: true, _id: d._id });
          self.removeFromIndexes(d);
        }
      });
    } catch (err) { return callback(err); }

    self.persistence.persistNewState(removedDocs, function (err) {
      if (err) { return callback(err); }
      return callback(null, numRemoved);
    });
  });
};

Datastore.prototype.remove = function () {
  this.executor.push({ this: this, fn: this._remove, arguments: arguments });
};



module.exports = Datastore;

},{"./cursor":29,"./customUtils":26,"./executor":31,"./indexes":32,"./model":33,"./persistence":34,"async":35,"events":23,"underscore":42,"util":45}],31:[function(require,module,exports){
(function (process){
/**
 * Responsible for sequentially executing actions on the database
 */

var async = require('async')
  ;

function Executor () {
  this.buffer = [];
  this.ready = false;

  // This queue will execute all commands, one-by-one in order
  this.queue = async.queue(function (task, cb) {
    var newArguments = [];

    // task.arguments is an array-like object on which adding a new field doesn't work, so we transform it into a real array
    for (var i = 0; i < task.arguments.length; i += 1) { newArguments.push(task.arguments[i]); }
    var lastArg = task.arguments[task.arguments.length - 1];

    // Always tell the queue task is complete. Execute callback if any was given.
    if (typeof lastArg === 'function') {
      // Callback was supplied
      newArguments[newArguments.length - 1] = function () {
        if (typeof setImmediate === 'function') {
           setImmediate(cb);
        } else {
          process.nextTick(cb);
        }
        lastArg.apply(null, arguments);
      };
    } else if (!lastArg && task.arguments.length !== 0) {
      // false/undefined/null supplied as callbback
      newArguments[newArguments.length - 1] = function () { cb(); };
    } else {
      // Nothing supplied as callback
      newArguments.push(function () { cb(); });
    }


    task.fn.apply(task.this, newArguments);
  }, 1);
}


/**
 * If executor is ready, queue task (and process it immediately if executor was idle)
 * If not, buffer task for later processing
 * @param {Object} task
 *                 task.this - Object to use as this
 *                 task.fn - Function to execute
 *                 task.arguments - Array of arguments, IMPORTANT: only the last argument may be a function (the callback)
 *                                                                 and the last argument cannot be false/undefined/null
 * @param {Boolean} forceQueuing Optional (defaults to false) force executor to queue task even if it is not ready
 */
Executor.prototype.push = function (task, forceQueuing) {
  if (this.ready || forceQueuing) {
    this.queue.push(task);
  } else {
    this.buffer.push(task);
  }
};


/**
 * Queue all tasks in buffer (in the same order they came in)
 * Automatically sets executor as ready
 */
Executor.prototype.processBuffer = function () {
  var i;
  this.ready = true;
  for (i = 0; i < this.buffer.length; i += 1) { this.queue.push(this.buffer[i]); }
  this.buffer = [];
};



// Interface
module.exports = Executor;

}).call(this,require('_process'))
},{"_process":37,"async":35}],32:[function(require,module,exports){
var BinarySearchTree = require('binary-search-tree').AVLTree
  , model = require('./model')
  , _ = require('underscore')
  , util = require('util')
  ;

/**
 * Two indexed pointers are equal iif they point to the same place
 */
function checkValueEquality (a, b) {
  return a === b;
}

/**
 * Type-aware projection
 */
function projectForUnique (elt) {
  if (elt === null) { return '$null'; }
  if (typeof elt === 'string') { return '$string' + elt; }
  if (typeof elt === 'boolean') { return '$boolean' + elt; }
  if (typeof elt === 'number') { return '$number' + elt; }
  if (util.isArray(elt)) { return '$date' + elt.getTime(); }

  return elt;   // Arrays and objects, will check for pointer equality
}


/**
 * Create a new index
 * All methods on an index guarantee that either the whole operation was successful and the index changed
 * or the operation was unsuccessful and an error is thrown while the index is unchanged
 * @param {String} options.fieldName On which field should the index apply (can use dot notation to index on sub fields)
 * @param {Boolean} options.unique Optional, enforce a unique constraint (default: false)
 * @param {Boolean} options.sparse Optional, allow a sparse index (we can have documents for which fieldName is undefined) (default: false)
 */
function Index (options) {
  this.fieldName = options.fieldName;
  this.unique = options.unique || false;
  this.sparse = options.sparse || false;

  this.treeOptions = { unique: this.unique, compareKeys: model.compareThings, checkValueEquality: checkValueEquality };

  this.reset();   // No data in the beginning
}


/**
 * Reset an index
 * @param {Document or Array of documents} newData Optional, data to initialize the index with
 *                                                 If an error is thrown during insertion, the index is not modified
 */
Index.prototype.reset = function (newData) {
  this.tree = new BinarySearchTree(this.treeOptions);

  if (newData) { this.insert(newData); }
};


/**
 * Insert a new document in the index
 * If an array is passed, we insert all its elements (if one insertion fails the index is not modified)
 * O(log(n))
 */
Index.prototype.insert = function (doc) {
  var key, self = this
    , keys, i, failingI, error
    ;

  if (util.isArray(doc)) { this.insertMultipleDocs(doc); return; }

  key = model.getDotValue(doc, this.fieldName);

  // We don't index documents that don't contain the field if the index is sparse
  if (key === undefined && this.sparse) { return; }

  if (!util.isArray(key)) {
    this.tree.insert(key, doc);
  } else {
    // If an insert fails due to a unique constraint, roll back all inserts before it
    keys = _.uniq(key, projectForUnique);

    for (i = 0; i < keys.length; i += 1) {
      try {
        this.tree.insert(keys[i], doc);
      } catch (e) {
        error = e;
        failingI = i;
        break;
      }
    }

    if (error) {
      for (i = 0; i < failingI; i += 1) {
        this.tree.delete(keys[i], doc);
      }

      throw error;
    }
  }
};


/**
 * Insert an array of documents in the index
 * If a constraint is violated, the changes should be rolled back and an error thrown
 *
 * @API private
 */
Index.prototype.insertMultipleDocs = function (docs) {
  var i, error, failingI;

  for (i = 0; i < docs.length; i += 1) {
    try {
      this.insert(docs[i]);
    } catch (e) {
      error = e;
      failingI = i;
      break;
    }
  }

  if (error) {
    for (i = 0; i < failingI; i += 1) {
      this.remove(docs[i]);
    }

    throw error;
  }
};


/**
 * Remove a document from the index
 * If an array is passed, we remove all its elements
 * The remove operation is safe with regards to the 'unique' constraint
 * O(log(n))
 */
Index.prototype.remove = function (doc) {
  var key, self = this;

  if (util.isArray(doc)) { doc.forEach(function (d) { self.remove(d); }); return; }

  key = model.getDotValue(doc, this.fieldName);

  if (key === undefined && this.sparse) { return; }

  if (!util.isArray(key)) {
    this.tree.delete(key, doc);
  } else {
    _.uniq(key, projectForUnique).forEach(function (_key) {
      self.tree.delete(_key, doc);
    });
  }
};


/**
 * Update a document in the index
 * If a constraint is violated, changes are rolled back and an error thrown
 * Naive implementation, still in O(log(n))
 */
Index.prototype.update = function (oldDoc, newDoc) {
  if (util.isArray(oldDoc)) { this.updateMultipleDocs(oldDoc); return; }

  this.remove(oldDoc);

  try {
    this.insert(newDoc);
  } catch (e) {
    this.insert(oldDoc);
    throw e;
  }
};


/**
 * Update multiple documents in the index
 * If a constraint is violated, the changes need to be rolled back
 * and an error thrown
 * @param {Array of oldDoc, newDoc pairs} pairs
 *
 * @API private
 */
Index.prototype.updateMultipleDocs = function (pairs) {
  var i, failingI, error;

  for (i = 0; i < pairs.length; i += 1) {
    this.remove(pairs[i].oldDoc);
  }

  for (i = 0; i < pairs.length; i += 1) {
    try {
      this.insert(pairs[i].newDoc);
    } catch (e) {
      error = e;
      failingI = i;
      break;
    }
  }

  // If an error was raised, roll back changes in the inverse order
  if (error) {
    for (i = 0; i < failingI; i += 1) {
      this.remove(pairs[i].newDoc);
    }

    for (i = 0; i < pairs.length; i += 1) {
      this.insert(pairs[i].oldDoc);
    }

    throw error;
  }
};


/**
 * Revert an update
 */
Index.prototype.revertUpdate = function (oldDoc, newDoc) {
  var revert = [];

  if (!util.isArray(oldDoc)) {
    this.update(newDoc, oldDoc);
  } else {
    oldDoc.forEach(function (pair) {
      revert.push({ oldDoc: pair.newDoc, newDoc: pair.oldDoc });
    });
    this.update(revert);
  }
};


/**
 * Get all documents in index whose key match value (if it is a Thing) or one of the elements of value (if it is an array of Things)
 * @param {Thing} value Value to match the key against
 * @return {Array of documents}
 */
Index.prototype.getMatching = function (value) {
  var self = this;

  if (!util.isArray(value)) {
    return self.tree.search(value);
  } else {
    var _res = {}, res = [];

    value.forEach(function (v) {
      self.getMatching(v).forEach(function (doc) {
        _res[doc._id] = doc;
      });
    });

    Object.keys(_res).forEach(function (_id) {
      res.push(_res[_id]);
    });

    return res;
  }
};


/**
 * Get all documents in index whose key is between bounds are they are defined by query
 * Documents are sorted by key
 * @param {Query} query
 * @return {Array of documents}
 */
Index.prototype.getBetweenBounds = function (query) {
  return this.tree.betweenBounds(query);
};


/**
 * Get all elements in the index
 * @return {Array of documents}
 */
Index.prototype.getAll = function () {
  var res = [];

  this.tree.executeOnEveryNode(function (node) {
    var i;

    for (i = 0; i < node.data.length; i += 1) {
      res.push(node.data[i]);
    }
  });

  return res;
};




// Interface
module.exports = Index;

},{"./model":33,"binary-search-tree":19,"underscore":42,"util":45}],33:[function(require,module,exports){
/**
 * Handle models (i.e. docs)
 * Serialization/deserialization
 * Copying
 * Querying, update
 */

var util = require('util')
  , _ = require('underscore')
  , modifierFunctions = {}
  , lastStepModifierFunctions = {}
  , comparisonFunctions = {}
  , logicalOperators = {}
  , arrayComparisonFunctions = {}
  ;


/**
 * Check a key, throw an error if the key is non valid
 * @param {String} k key
 * @param {Model} v value, needed to treat the Date edge case
 * Non-treatable edge cases here: if part of the object if of the form { $$date: number } or { $$deleted: true }
 * Its serialized-then-deserialized version it will transformed into a Date object
 * But you really need to want it to trigger such behaviour, even when warned not to use '$' at the beginning of the field names...
 */
function checkKey (k, v) {
  if (typeof k === 'number') {
    k = k.toString();
  }

  if (k[0] === '$' && !(k === '$$date' && typeof v === 'number') && !(k === '$$deleted' && v === true) && !(k === '$$indexCreated') && !(k === '$$indexRemoved')) {
    throw new Error('Field names cannot begin with the $ character');
  }

  if (k.indexOf('.') !== -1) {
    throw new Error('Field names cannot contain a .');
  }
}


/**
 * Check a DB object and throw an error if it's not valid
 * Works by applying the above checkKey function to all fields recursively
 */
function checkObject (obj) {
  if (util.isArray(obj)) {
    obj.forEach(function (o) {
      checkObject(o);
    });
  }

  if (typeof obj === 'object' && obj !== null) {
    Object.keys(obj).forEach(function (k) {
      checkKey(k, obj[k]);
      checkObject(obj[k]);
    });
  }
}


/**
 * Serialize an object to be persisted to a one-line string
 * For serialization/deserialization, we use the native JSON parser and not eval or Function
 * That gives us less freedom but data entered in the database may come from users
 * so eval and the like are not safe
 * Accepted primitive types: Number, String, Boolean, Date, null
 * Accepted secondary types: Objects, Arrays
 */
function serialize (obj) {
  var res;

  res = JSON.stringify(obj, function (k, v) {
    checkKey(k, v);

    if (v === undefined) { return undefined; }
    if (v === null) { return null; }

    // Hackish way of checking if object is Date (this way it works between execution contexts in node-webkit).
    // We can't use value directly because for dates it is already string in this function (date.toJSON was already called), so we use this
    if (typeof this[k].getTime === 'function') { return { $$date: this[k].getTime() }; }

    return v;
  });

  return res;
}


/**
 * From a one-line representation of an object generate by the serialize function
 * Return the object itself
 */
function deserialize (rawData) {
  return JSON.parse(rawData, function (k, v) {
    if (k === '$$date') { return new Date(v); }
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' || v === null) { return v; }
    if (v && v.$$date) { return v.$$date; }

    return v;
  });
}


/**
 * Deep copy a DB object
 * The optional strictKeys flag (defaulting to false) indicates whether to copy everything or only fields
 * where the keys are valid, i.e. don't begin with $ and don't contain a .
 */
function deepCopy (obj, strictKeys) {
  var res;

  if ( typeof obj === 'boolean' ||
       typeof obj === 'number' ||
       typeof obj === 'string' ||
       obj === null ||
       (util.isDate(obj)) ) {
    return obj;
  }

  if (util.isArray(obj)) {
    res = [];
    obj.forEach(function (o) { res.push(deepCopy(o, strictKeys)); });
    return res;
  }

  if (typeof obj === 'object') {
    res = {};
    Object.keys(obj).forEach(function (k) {
      if (!strictKeys || (k[0] !== '$' && k.indexOf('.') === -1)) {
        res[k] = deepCopy(obj[k], strictKeys);
      }
    });
    return res;
  }

  return undefined;   // For now everything else is undefined. We should probably throw an error instead
}


/**
 * Tells if an object is a primitive type or a "real" object
 * Arrays are considered primitive
 */
function isPrimitiveType (obj) {
  return ( typeof obj === 'boolean' ||
       typeof obj === 'number' ||
       typeof obj === 'string' ||
       obj === null ||
       util.isDate(obj) ||
       util.isArray(obj));
}


/**
 * Utility functions for comparing things
 * Assumes type checking was already done (a and b already have the same type)
 * compareNSB works for numbers, strings and booleans
 */
function compareNSB (a, b) {
  if (a < b) { return -1; }
  if (a > b) { return 1; }
  return 0;
}

function compareArrays (a, b) {
  var i, comp;

  for (i = 0; i < Math.min(a.length, b.length); i += 1) {
    comp = compareThings(a[i], b[i]);

    if (comp !== 0) { return comp; }
  }

  // Common section was identical, longest one wins
  return compareNSB(a.length, b.length);
}


/**
 * Compare { things U undefined }
 * Things are defined as any native types (string, number, boolean, null, date) and objects
 * We need to compare with undefined as it will be used in indexes
 * In the case of objects and arrays, we deep-compare
 * If two objects dont have the same type, the (arbitrary) type hierarchy is: undefined, null, number, strings, boolean, dates, arrays, objects
 * Return -1 if a < b, 1 if a > b and 0 if a = b (note that equality here is NOT the same as defined in areThingsEqual!)
 *
 * @param {Function} _compareStrings String comparing function, returning -1, 0 or 1, overriding default string comparison (useful for languages with accented letters)
 */
function compareThings (a, b, _compareStrings) {
  var aKeys, bKeys, comp, i
    , compareStrings = _compareStrings || compareNSB;

  // undefined
  if (a === undefined) { return b === undefined ? 0 : -1; }
  if (b === undefined) { return a === undefined ? 0 : 1; }

  // null
  if (a === null) { return b === null ? 0 : -1; }
  if (b === null) { return a === null ? 0 : 1; }

  // Numbers
  if (typeof a === 'number') { return typeof b === 'number' ? compareNSB(a, b) : -1; }
  if (typeof b === 'number') { return typeof a === 'number' ? compareNSB(a, b) : 1; }

  // Strings
  if (typeof a === 'string') { return typeof b === 'string' ? compareStrings(a, b) : -1; }
  if (typeof b === 'string') { return typeof a === 'string' ? compareStrings(a, b) : 1; }

  // Booleans
  if (typeof a === 'boolean') { return typeof b === 'boolean' ? compareNSB(a, b) : -1; }
  if (typeof b === 'boolean') { return typeof a === 'boolean' ? compareNSB(a, b) : 1; }

  // Dates
  if (util.isDate(a)) { return util.isDate(b) ? compareNSB(a.getTime(), b.getTime()) : -1; }
  if (util.isDate(b)) { return util.isDate(a) ? compareNSB(a.getTime(), b.getTime()) : 1; }

  // Arrays (first element is most significant and so on)
  if (util.isArray(a)) { return util.isArray(b) ? compareArrays(a, b) : -1; }
  if (util.isArray(b)) { return util.isArray(a) ? compareArrays(a, b) : 1; }

  // Objects
  aKeys = Object.keys(a).sort();
  bKeys = Object.keys(b).sort();

  for (i = 0; i < Math.min(aKeys.length, bKeys.length); i += 1) {
    comp = compareThings(a[aKeys[i]], b[bKeys[i]]);

    if (comp !== 0) { return comp; }
  }

  return compareNSB(aKeys.length, bKeys.length);
}



// ==============================================================
// Updating documents
// ==============================================================

/**
 * The signature of modifier functions is as follows
 * Their structure is always the same: recursively follow the dot notation while creating
 * the nested documents if needed, then apply the "last step modifier"
 * @param {Object} obj The model to modify
 * @param {String} field Can contain dots, in that case that means we will set a subfield recursively
 * @param {Model} value
 */

/**
 * Set a field to a new value
 */
lastStepModifierFunctions.$set = function (obj, field, value) {
  obj[field] = value;
};


/**
 * Unset a field
 */
lastStepModifierFunctions.$unset = function (obj, field, value) {
  delete obj[field];
};


/**
 * Push an element to the end of an array field
 * Optional modifier $each instead of value to push several values
 * Optional modifier $slice to slice the resulting array, see https://docs.mongodb.org/manual/reference/operator/update/slice/
 * Différeence with MongoDB: if $slice is specified and not $each, we act as if value is an empty array
 */
lastStepModifierFunctions.$push = function (obj, field, value) {
  // Create the array if it doesn't exist
  if (!obj.hasOwnProperty(field)) { obj[field] = []; }

  if (!util.isArray(obj[field])) { throw new Error("Can't $push an element on non-array values"); }

  if (value !== null && typeof value === 'object' && value.$slice && value.$each === undefined) {
    value.$each = [];
  }

  if (value !== null && typeof value === 'object' && value.$each) {
    if (Object.keys(value).length >= 3 || (Object.keys(value).length === 2 && value.$slice === undefined)) { throw new Error("Can only use $slice in cunjunction with $each when $push to array"); }
    if (!util.isArray(value.$each)) { throw new Error("$each requires an array value"); }

    value.$each.forEach(function (v) {
      obj[field].push(v);
    });

    if (value.$slice === undefined || typeof value.$slice !== 'number') { return; }

    if (value.$slice === 0) {
      obj[field] = [];
    } else {
      var start, end, n = obj[field].length;
      if (value.$slice < 0) {
        start = Math.max(0, n + value.$slice);
        end = n;
      } else if (value.$slice > 0) {
        start = 0;
        end = Math.min(n, value.$slice);
      }
      obj[field] = obj[field].slice(start, end);
    }
  } else {
    obj[field].push(value);
  }
};


/**
 * Add an element to an array field only if it is not already in it
 * No modification if the element is already in the array
 * Note that it doesn't check whether the original array contains duplicates
 */
lastStepModifierFunctions.$addToSet = function (obj, field, value) {
  var addToSet = true;

  // Create the array if it doesn't exist
  if (!obj.hasOwnProperty(field)) { obj[field] = []; }

  if (!util.isArray(obj[field])) { throw new Error("Can't $addToSet an element on non-array values"); }

  if (value !== null && typeof value === 'object' && value.$each) {
    if (Object.keys(value).length > 1) { throw new Error("Can't use another field in conjunction with $each"); }
    if (!util.isArray(value.$each)) { throw new Error("$each requires an array value"); }

    value.$each.forEach(function (v) {
      lastStepModifierFunctions.$addToSet(obj, field, v);
    });
  } else {
    obj[field].forEach(function (v) {
      if (compareThings(v, value) === 0) { addToSet = false; }
    });
    if (addToSet) { obj[field].push(value); }
  }
};


/**
 * Remove the first or last element of an array
 */
lastStepModifierFunctions.$pop = function (obj, field, value) {
  if (!util.isArray(obj[field])) { throw new Error("Can't $pop an element from non-array values"); }
  if (typeof value !== 'number') { throw new Error(value + " isn't an integer, can't use it with $pop"); }
  if (value === 0) { return; }

  if (value > 0) {
    obj[field] = obj[field].slice(0, obj[field].length - 1);
  } else {
    obj[field] = obj[field].slice(1);
  }
};


/**
 * Removes all instances of a value from an existing array
 */
lastStepModifierFunctions.$pull = function (obj, field, value) {
  var arr, i;

  if (!util.isArray(obj[field])) { throw new Error("Can't $pull an element from non-array values"); }

  arr = obj[field];
  for (i = arr.length - 1; i >= 0; i -= 1) {
    if (match(arr[i], value)) {
      arr.splice(i, 1);
    }
  }
};


/**
 * Increment a numeric field's value
 */
lastStepModifierFunctions.$inc = function (obj, field, value) {
  if (typeof value !== 'number') { throw new Error(value + " must be a number"); }

  if (typeof obj[field] !== 'number') {
    if (!_.has(obj, field)) {
      obj[field] = value;
    } else {
      throw new Error("Don't use the $inc modifier on non-number fields");
    }
  } else {
    obj[field] += value;
  }
};

/**
 * Updates the value of the field, only if specified field is greater than the current value of the field
 */
lastStepModifierFunctions.$max = function (obj, field, value) {
  if (typeof obj[field] === 'undefined') {
    obj[field] = value;
  } else if (value > obj[field]) {
    obj[field] = value;
  }
};

/**
 * Updates the value of the field, only if specified field is smaller than the current value of the field
 */
lastStepModifierFunctions.$min = function (obj, field, value) {
  if (typeof obj[field] === 'undefined') { 
    obj[field] = value;
  } else if (value < obj[field]) {
    obj[field] = value;
  }
};

// Given its name, create the complete modifier function
function createModifierFunction (modifier) {
  return function (obj, field, value) {
    var fieldParts = typeof field === 'string' ? field.split('.') : field;

    if (fieldParts.length === 1) {
      lastStepModifierFunctions[modifier](obj, field, value);
    } else {
      if (obj[fieldParts[0]] === undefined) {
        if (modifier === '$unset') { return; }   // Bad looking specific fix, needs to be generalized modifiers that behave like $unset are implemented
        obj[fieldParts[0]] = {};
      }
      modifierFunctions[modifier](obj[fieldParts[0]], fieldParts.slice(1), value);
    }
  };
}

// Actually create all modifier functions
Object.keys(lastStepModifierFunctions).forEach(function (modifier) {
  modifierFunctions[modifier] = createModifierFunction(modifier);
});


/**
 * Modify a DB object according to an update query
 */
function modify (obj, updateQuery) {
  var keys = Object.keys(updateQuery)
    , firstChars = _.map(keys, function (item) { return item[0]; })
    , dollarFirstChars = _.filter(firstChars, function (c) { return c === '$'; })
    , newDoc, modifiers
    ;

  if (keys.indexOf('_id') !== -1 && updateQuery._id !== obj._id) { throw new Error("You cannot change a document's _id"); }

  if (dollarFirstChars.length !== 0 && dollarFirstChars.length !== firstChars.length) {
    throw new Error("You cannot mix modifiers and normal fields");
  }

  if (dollarFirstChars.length === 0) {
    // Simply replace the object with the update query contents
    newDoc = deepCopy(updateQuery);
    newDoc._id = obj._id;
  } else {
    // Apply modifiers
    modifiers = _.uniq(keys);
    newDoc = deepCopy(obj);
    modifiers.forEach(function (m) {
      var keys;

      if (!modifierFunctions[m]) { throw new Error("Unknown modifier " + m); }

      // Can't rely on Object.keys throwing on non objects since ES6
      // Not 100% satisfying as non objects can be interpreted as objects but no false negatives so we can live with it
      if (typeof updateQuery[m] !== 'object') {
        throw new Error("Modifier " + m + "'s argument must be an object");
      }

      keys = Object.keys(updateQuery[m]);
      keys.forEach(function (k) {
        modifierFunctions[m](newDoc, k, updateQuery[m][k]);
      });
    });
  }

  // Check result is valid and return it
  checkObject(newDoc);

  if (obj._id !== newDoc._id) { throw new Error("You can't change a document's _id"); }
  return newDoc;
};


// ==============================================================
// Finding documents
// ==============================================================

/**
 * Get a value from object with dot notation
 * @param {Object} obj
 * @param {String} field
 */
function getDotValue (obj, field) {
  var fieldParts = typeof field === 'string' ? field.split('.') : field
    , i, objs;

  if (!obj) { return undefined; }   // field cannot be empty so that means we should return undefined so that nothing can match

  if (fieldParts.length === 0) { return obj; }

  if (fieldParts.length === 1) { return obj[fieldParts[0]]; }

  if (util.isArray(obj[fieldParts[0]])) {
    // If the next field is an integer, return only this item of the array
    i = parseInt(fieldParts[1], 10);
    if (typeof i === 'number' && !isNaN(i)) {
      return getDotValue(obj[fieldParts[0]][i], fieldParts.slice(2))
    }

    // Return the array of values
    objs = new Array();
    for (i = 0; i < obj[fieldParts[0]].length; i += 1) {
       objs.push(getDotValue(obj[fieldParts[0]][i], fieldParts.slice(1)));
    }
    return objs;
  } else {
    return getDotValue(obj[fieldParts[0]], fieldParts.slice(1));
  }
}


/**
 * Check whether 'things' are equal
 * Things are defined as any native types (string, number, boolean, null, date) and objects
 * In the case of object, we check deep equality
 * Returns true if they are, false otherwise
 */
function areThingsEqual (a, b) {
  var aKeys , bKeys , i;

  // Strings, booleans, numbers, null
  if (a === null || typeof a === 'string' || typeof a === 'boolean' || typeof a === 'number' ||
      b === null || typeof b === 'string' || typeof b === 'boolean' || typeof b === 'number') { return a === b; }

  // Dates
  if (util.isDate(a) || util.isDate(b)) { return util.isDate(a) && util.isDate(b) && a.getTime() === b.getTime(); }

  // Arrays (no match since arrays are used as a $in)
  // undefined (no match since they mean field doesn't exist and can't be serialized)
  if ((!(util.isArray(a) && util.isArray(b)) && (util.isArray(a) || util.isArray(b))) || a === undefined || b === undefined) { return false; }

  // General objects (check for deep equality)
  // a and b should be objects at this point
  try {
    aKeys = Object.keys(a);
    bKeys = Object.keys(b);
  } catch (e) {
    return false;
  }

  if (aKeys.length !== bKeys.length) { return false; }
  for (i = 0; i < aKeys.length; i += 1) {
    if (bKeys.indexOf(aKeys[i]) === -1) { return false; }
    if (!areThingsEqual(a[aKeys[i]], b[aKeys[i]])) { return false; }
  }
  return true;
}


/**
 * Check that two values are comparable
 */
function areComparable (a, b) {
  if (typeof a !== 'string' && typeof a !== 'number' && !util.isDate(a) &&
      typeof b !== 'string' && typeof b !== 'number' && !util.isDate(b)) {
    return false;
  }

  if (typeof a !== typeof b) { return false; }

  return true;
}


/**
 * Arithmetic and comparison operators
 * @param {Native value} a Value in the object
 * @param {Native value} b Value in the query
 */
comparisonFunctions.$lt = function (a, b) {
  return areComparable(a, b) && a < b;
};

comparisonFunctions.$lte = function (a, b) {
  return areComparable(a, b) && a <= b;
};

comparisonFunctions.$gt = function (a, b) {
  return areComparable(a, b) && a > b;
};

comparisonFunctions.$gte = function (a, b) {
  return areComparable(a, b) && a >= b;
};

comparisonFunctions.$ne = function (a, b) {
  if (a === undefined) { return true; }
  return !areThingsEqual(a, b);
};

comparisonFunctions.$in = function (a, b) {
  var i;

  if (!util.isArray(b)) { throw new Error("$in operator called with a non-array"); }

  for (i = 0; i < b.length; i += 1) {
    if (areThingsEqual(a, b[i])) { return true; }
  }

  return false;
};

comparisonFunctions.$nin = function (a, b) {
  if (!util.isArray(b)) { throw new Error("$nin operator called with a non-array"); }

  return !comparisonFunctions.$in(a, b);
};

comparisonFunctions.$regex = function (a, b) {
  if (!util.isRegExp(b)) { throw new Error("$regex operator called with non regular expression"); }

  if (typeof a !== 'string') {
    return false
  } else {
    return b.test(a);
  }
};

comparisonFunctions.$exists = function (value, exists) {
  if (exists || exists === '') {   // This will be true for all values of exists except false, null, undefined and 0
    exists = true;                 // That's strange behaviour (we should only use true/false) but that's the way Mongo does it...
  } else {
    exists = false;
  }

  if (value === undefined) {
    return !exists
  } else {
    return exists;
  }
};

// Specific to arrays
comparisonFunctions.$size = function (obj, value) {
    if (!util.isArray(obj)) { return false; }
    if (value % 1 !== 0) { throw new Error("$size operator called without an integer"); }

    return (obj.length == value);
};
comparisonFunctions.$elemMatch = function (obj, value) {
  if (!util.isArray(obj)) { return false; }
  var i = obj.length;
  var result = false;   // Initialize result
  while (i--) {
    if (match(obj[i], value)) {   // If match for array element, return true
      result = true;
      break;
    }
  }
  return result;
};
arrayComparisonFunctions.$size = true;
arrayComparisonFunctions.$elemMatch = true;


/**
 * Match any of the subqueries
 * @param {Model} obj
 * @param {Array of Queries} query
 */
logicalOperators.$or = function (obj, query) {
  var i;

  if (!util.isArray(query)) { throw new Error("$or operator used without an array"); }

  for (i = 0; i < query.length; i += 1) {
    if (match(obj, query[i])) { return true; }
  }

  return false;
};


/**
 * Match all of the subqueries
 * @param {Model} obj
 * @param {Array of Queries} query
 */
logicalOperators.$and = function (obj, query) {
  var i;

  if (!util.isArray(query)) { throw new Error("$and operator used without an array"); }

  for (i = 0; i < query.length; i += 1) {
    if (!match(obj, query[i])) { return false; }
  }

  return true;
};


/**
 * Inverted match of the query
 * @param {Model} obj
 * @param {Query} query
 */
logicalOperators.$not = function (obj, query) {
  return !match(obj, query);
};


/**
 * Use a function to match
 * @param {Model} obj
 * @param {Query} query
 */
logicalOperators.$where = function (obj, fn) {
  var result;

  if (!_.isFunction(fn)) { throw new Error("$where operator used without a function"); }

  result = fn.call(obj);
  if (!_.isBoolean(result)) { throw new Error("$where function must return boolean"); }

  return result;
};


/**
 * Tell if a given document matches a query
 * @param {Object} obj Document to check
 * @param {Object} query
 */
function match (obj, query) {
  var queryKeys, queryKey, queryValue, i;

  // Primitive query against a primitive type
  // This is a bit of a hack since we construct an object with an arbitrary key only to dereference it later
  // But I don't have time for a cleaner implementation now
  if (isPrimitiveType(obj) || isPrimitiveType(query)) {
    return matchQueryPart({ needAKey: obj }, 'needAKey', query);
  }

  // Normal query
  queryKeys = Object.keys(query);
  for (i = 0; i < queryKeys.length; i += 1) {
    queryKey = queryKeys[i];
    queryValue = query[queryKey];

    if (queryKey[0] === '$') {
      if (!logicalOperators[queryKey]) { throw new Error("Unknown logical operator " + queryKey); }
      if (!logicalOperators[queryKey](obj, queryValue)) { return false; }
    } else {
      if (!matchQueryPart(obj, queryKey, queryValue)) { return false; }
    }
  }

  return true;
};


/**
 * Match an object against a specific { key: value } part of a query
 * if the treatObjAsValue flag is set, don't try to match every part separately, but the array as a whole
 */
function matchQueryPart (obj, queryKey, queryValue, treatObjAsValue) {
  var objValue = getDotValue(obj, queryKey)
    , i, keys, firstChars, dollarFirstChars;

  // Check if the value is an array if we don't force a treatment as value
  if (util.isArray(objValue) && !treatObjAsValue) {
    // If the queryValue is an array, try to perform an exact match
    if (util.isArray(queryValue)) {
      return matchQueryPart(obj, queryKey, queryValue, true);
    }

    // Check if we are using an array-specific comparison function
    if (queryValue !== null && typeof queryValue === 'object' && !util.isRegExp(queryValue)) {
      keys = Object.keys(queryValue);
      for (i = 0; i < keys.length; i += 1) {
        if (arrayComparisonFunctions[keys[i]]) { return matchQueryPart(obj, queryKey, queryValue, true); }
      }
    }

    // If not, treat it as an array of { obj, query } where there needs to be at least one match
    for (i = 0; i < objValue.length; i += 1) {
      if (matchQueryPart({ k: objValue[i] }, 'k', queryValue)) { return true; }   // k here could be any string
    }
    return false;
  }

  // queryValue is an actual object. Determine whether it contains comparison operators
  // or only normal fields. Mixed objects are not allowed
  if (queryValue !== null && typeof queryValue === 'object' && !util.isRegExp(queryValue) && !util.isArray(queryValue)) {
    keys = Object.keys(queryValue);
    firstChars = _.map(keys, function (item) { return item[0]; });
    dollarFirstChars = _.filter(firstChars, function (c) { return c === '$'; });

    if (dollarFirstChars.length !== 0 && dollarFirstChars.length !== firstChars.length) {
      throw new Error("You cannot mix operators and normal fields");
    }

    // queryValue is an object of this form: { $comparisonOperator1: value1, ... }
    if (dollarFirstChars.length > 0) {
      for (i = 0; i < keys.length; i += 1) {
        if (!comparisonFunctions[keys[i]]) { throw new Error("Unknown comparison function " + keys[i]); }

        if (!comparisonFunctions[keys[i]](objValue, queryValue[keys[i]])) { return false; }
      }
      return true;
    }
  }

  // Using regular expressions with basic querying
  if (util.isRegExp(queryValue)) { return comparisonFunctions.$regex(objValue, queryValue); }

  // queryValue is either a native value or a normal object
  // Basic matching is possible
  if (!areThingsEqual(objValue, queryValue)) { return false; }

  return true;
}


// Interface
module.exports.serialize = serialize;
module.exports.deserialize = deserialize;
module.exports.deepCopy = deepCopy;
module.exports.checkObject = checkObject;
module.exports.isPrimitiveType = isPrimitiveType;
module.exports.modify = modify;
module.exports.getDotValue = getDotValue;
module.exports.match = match;
module.exports.areThingsEqual = areThingsEqual;
module.exports.compareThings = compareThings;

},{"underscore":42,"util":45}],34:[function(require,module,exports){
(function (process){
/**
 * Handle every persistence-related task
 * The interface Datastore expects to be implemented is
 * * Persistence.loadDatabase(callback) and callback has signature err
 * * Persistence.persistNewState(newDocs, callback) where newDocs is an array of documents and callback has signature err
 */

var storage = require('./storage')
  , path = require('path')
  , model = require('./model')
  , async = require('async')
  , customUtils = require('./customUtils')
  , Index = require('./indexes')
  ;


/**
 * Create a new Persistence object for database options.db
 * @param {Datastore} options.db
 * @param {Boolean} options.nodeWebkitAppName Optional, specify the name of your NW app if you want options.filename to be relative to the directory where
 *                                            Node Webkit stores application data such as cookies and local storage (the best place to store data in my opinion)
 */
function Persistence (options) {
  var i, j, randomString;

  this.db = options.db;
  this.inMemoryOnly = this.db.inMemoryOnly;
  this.filename = this.db.filename;
  this.corruptAlertThreshold = options.corruptAlertThreshold !== undefined ? options.corruptAlertThreshold : 0.1;

  if (!this.inMemoryOnly && this.filename && this.filename.charAt(this.filename.length - 1) === '~') {
    throw new Error("The datafile name can't end with a ~, which is reserved for crash safe backup files");
  }

  // After serialization and before deserialization hooks with some basic sanity checks
  if (options.afterSerialization && !options.beforeDeserialization) {
    throw new Error("Serialization hook defined but deserialization hook undefined, cautiously refusing to start NeDB to prevent dataloss");
  }
  if (!options.afterSerialization && options.beforeDeserialization) {
    throw new Error("Serialization hook undefined but deserialization hook defined, cautiously refusing to start NeDB to prevent dataloss");
  }
  this.afterSerialization = options.afterSerialization || function (s) { return s; };
  this.beforeDeserialization = options.beforeDeserialization || function (s) { return s; };
  for (i = 1; i < 30; i += 1) {
    for (j = 0; j < 10; j += 1) {
      randomString = customUtils.uid(i);
      if (this.beforeDeserialization(this.afterSerialization(randomString)) !== randomString) {
        throw new Error("beforeDeserialization is not the reverse of afterSerialization, cautiously refusing to start NeDB to prevent dataloss");
      }
    }
  }

  // For NW apps, store data in the same directory where NW stores application data
  if (this.filename && options.nodeWebkitAppName) {
    console.log("==================================================================");
    console.log("WARNING: The nodeWebkitAppName option is deprecated");
    console.log("To get the path to the directory where Node Webkit stores the data");
    console.log("for your app, use the internal nw.gui module like this");
    console.log("require('nw.gui').App.dataPath");
    console.log("See https://github.com/rogerwang/node-webkit/issues/500");
    console.log("==================================================================");
    this.filename = Persistence.getNWAppFilename(options.nodeWebkitAppName, this.filename);
  }
};


/**
 * Check if a directory exists and create it on the fly if it is not the case
 * cb is optional, signature: err
 */
Persistence.ensureDirectoryExists = function (dir, cb) {
  var callback = cb || function () {}
    ;

  storage.mkdirp(dir, function (err) { return callback(err); });
};




/**
 * Return the path the datafile if the given filename is relative to the directory where Node Webkit stores
 * data for this application. Probably the best place to store data
 */
Persistence.getNWAppFilename = function (appName, relativeFilename) {
  var home;

  switch (process.platform) {
    case 'win32':
    case 'win64':
      home = process.env.LOCALAPPDATA || process.env.APPDATA;
      if (!home) { throw new Error("Couldn't find the base application data folder"); }
      home = path.join(home, appName);
      break;
    case 'darwin':
      home = process.env.HOME;
      if (!home) { throw new Error("Couldn't find the base application data directory"); }
      home = path.join(home, 'Library', 'Application Support', appName);
      break;
    case 'linux':
      home = process.env.HOME;
      if (!home) { throw new Error("Couldn't find the base application data directory"); }
      home = path.join(home, '.config', appName);
      break;
    default:
      throw new Error("Can't use the Node Webkit relative path for platform " + process.platform);
      break;
  }

  return path.join(home, 'nedb-data', relativeFilename);
}


/**
 * Persist cached database
 * This serves as a compaction function since the cache always contains only the number of documents in the collection
 * while the data file is append-only so it may grow larger
 * @param {Function} cb Optional callback, signature: err
 */
Persistence.prototype.persistCachedDatabase = function (cb) {
  var callback = cb || function () {}
    , toPersist = ''
    , self = this
    ;

  if (this.inMemoryOnly) { return callback(null); }

  this.db.getAllData().forEach(function (doc) {
    toPersist += self.afterSerialization(model.serialize(doc)) + '\n';
  });
  Object.keys(this.db.indexes).forEach(function (fieldName) {
    if (fieldName != "_id") {   // The special _id index is managed by datastore.js, the others need to be persisted
      toPersist += self.afterSerialization(model.serialize({ $$indexCreated: { fieldName: fieldName, unique: self.db.indexes[fieldName].unique, sparse: self.db.indexes[fieldName].sparse }})) + '\n';
    }
  });

  storage.crashSafeWriteFile(this.filename, toPersist, function (err) {
    if (err) { return callback(err); }
    self.db.emit('compaction.done');
    return callback(null);
  });
};


/**
 * Queue a rewrite of the datafile
 */
Persistence.prototype.compactDatafile = function () {
  this.db.executor.push({ this: this, fn: this.persistCachedDatabase, arguments: [] });
};


/**
 * Set automatic compaction every interval ms
 * @param {Number} interval in milliseconds, with an enforced minimum of 5 seconds
 */
Persistence.prototype.setAutocompactionInterval = function (interval) {
  var self = this
    , minInterval = 5000
    , realInterval = Math.max(interval || 0, minInterval)
    ;

  this.stopAutocompaction();

  this.autocompactionIntervalId = setInterval(function () {
    self.compactDatafile();
  }, realInterval);
};


/**
 * Stop autocompaction (do nothing if autocompaction was not running)
 */
Persistence.prototype.stopAutocompaction = function () {
  if (this.autocompactionIntervalId) { clearInterval(this.autocompactionIntervalId); }
};


/**
 * Persist new state for the given newDocs (can be insertion, update or removal)
 * Use an append-only format
 * @param {Array} newDocs Can be empty if no doc was updated/removed
 * @param {Function} cb Optional, signature: err
 */
Persistence.prototype.persistNewState = function (newDocs, cb) {
  var self = this
    , toPersist = ''
    , callback = cb || function () {}
    ;

  // In-memory only datastore
  if (self.inMemoryOnly) { return callback(null); }

  newDocs.forEach(function (doc) {
    toPersist += self.afterSerialization(model.serialize(doc)) + '\n';
  });

  if (toPersist.length === 0) { return callback(null); }

  storage.appendFile(self.filename, toPersist, 'utf8', function (err) {
    return callback(err);
  });
};


/**
 * From a database's raw data, return the corresponding
 * machine understandable collection
 */
Persistence.prototype.treatRawData = function (rawData) {
  var data = rawData.split('\n')
    , dataById = {}
    , tdata = []
    , i
    , indexes = {}
    , corruptItems = -1   // Last line of every data file is usually blank so not really corrupt
    ;

  for (i = 0; i < data.length; i += 1) {
    var doc;

    try {
      doc = model.deserialize(this.beforeDeserialization(data[i]));
      if (doc._id) {
        if (doc.$$deleted === true) {
          delete dataById[doc._id];
        } else {
          dataById[doc._id] = doc;
        }
      } else if (doc.$$indexCreated && doc.$$indexCreated.fieldName != undefined) {
        indexes[doc.$$indexCreated.fieldName] = doc.$$indexCreated;
      } else if (typeof doc.$$indexRemoved === "string") {
        delete indexes[doc.$$indexRemoved];
      }
    } catch (e) {
      corruptItems += 1;
    }
  }

  // A bit lenient on corruption
  if (data.length > 0 && corruptItems / data.length > this.corruptAlertThreshold) {
    throw new Error("More than " + Math.floor(100 * this.corruptAlertThreshold) + "% of the data file is corrupt, the wrong beforeDeserialization hook may be used. Cautiously refusing to start NeDB to prevent dataloss");
  }

  Object.keys(dataById).forEach(function (k) {
    tdata.push(dataById[k]);
  });

  return { data: tdata, indexes: indexes };
};


/**
 * Load the database
 * 1) Create all indexes
 * 2) Insert all data
 * 3) Compact the database
 * This means pulling data out of the data file or creating it if it doesn't exist
 * Also, all data is persisted right away, which has the effect of compacting the database file
 * This operation is very quick at startup for a big collection (60ms for ~10k docs)
 * @param {Function} cb Optional callback, signature: err
 */
Persistence.prototype.loadDatabase = function (cb) {
  var callback = cb || function () {}
    , self = this
    ;

  self.db.resetIndexes();

  // In-memory only datastore
  if (self.inMemoryOnly) { return callback(null); }

  async.waterfall([
    function (cb) {
      Persistence.ensureDirectoryExists(path.dirname(self.filename), function (err) {
        storage.ensureDatafileIntegrity(self.filename, function (err) {
          storage.readFile(self.filename, 'utf8', function (err, rawData) {
            if (err) { return cb(err); }

            try {
              var treatedData = self.treatRawData(rawData);
            } catch (e) {
              return cb(e);
            }

            // Recreate all indexes in the datafile
            Object.keys(treatedData.indexes).forEach(function (key) {
              self.db.indexes[key] = new Index(treatedData.indexes[key]);
            });

            // Fill cached database (i.e. all indexes) with data
            try {
              self.db.resetIndexes(treatedData.data);
            } catch (e) {
              self.db.resetIndexes();   // Rollback any index which didn't fail
              return cb(e);
            }

            self.db.persistence.persistCachedDatabase(cb);
          });
        });
      });
    }
  ], function (err) {
       if (err) { return callback(err); }

       self.db.executor.processBuffer();
       return callback(null);
     });
};


// Interface
module.exports = Persistence;

}).call(this,require('_process'))
},{"./customUtils":26,"./indexes":32,"./model":33,"./storage":27,"_process":37,"async":35,"path":36}],35:[function(require,module,exports){
(function (process){
/*global setImmediate: false, setTimeout: false, console: false */
(function () {

    var async = {};

    // global on the server, window in the browser
    var root, previous_async;

    root = this;
    if (root != null) {
      previous_async = root.async;
    }

    async.noConflict = function () {
        root.async = previous_async;
        return async;
    };

    function only_once(fn) {
        var called = false;
        return function() {
            if (called) throw new Error("Callback was already called.");
            called = true;
            fn.apply(root, arguments);
        }
    }

    //// cross-browser compatiblity functions ////

    var _each = function (arr, iterator) {
        if (arr.forEach) {
            return arr.forEach(iterator);
        }
        for (var i = 0; i < arr.length; i += 1) {
            iterator(arr[i], i, arr);
        }
    };

    var _map = function (arr, iterator) {
        if (arr.map) {
            return arr.map(iterator);
        }
        var results = [];
        _each(arr, function (x, i, a) {
            results.push(iterator(x, i, a));
        });
        return results;
    };

    var _reduce = function (arr, iterator, memo) {
        if (arr.reduce) {
            return arr.reduce(iterator, memo);
        }
        _each(arr, function (x, i, a) {
            memo = iterator(memo, x, i, a);
        });
        return memo;
    };

    var _keys = function (obj) {
        if (Object.keys) {
            return Object.keys(obj);
        }
        var keys = [];
        for (var k in obj) {
            if (obj.hasOwnProperty(k)) {
                keys.push(k);
            }
        }
        return keys;
    };

    //// exported async module functions ////

    //// nextTick implementation with browser-compatible fallback ////
    if (typeof process === 'undefined' || !(process.nextTick)) {
        if (typeof setImmediate === 'function') {
            async.nextTick = function (fn) {
                // not a direct alias for IE10 compatibility
                setImmediate(fn);
            };
            async.setImmediate = async.nextTick;
        }
        else {
            async.nextTick = function (fn) {
                setTimeout(fn, 0);
            };
            async.setImmediate = async.nextTick;
        }
    }
    else {
        async.nextTick = process.nextTick;
        if (typeof setImmediate !== 'undefined') {
            async.setImmediate = function (fn) {
              // not a direct alias for IE10 compatibility
              setImmediate(fn);
            };
        }
        else {
            async.setImmediate = async.nextTick;
        }
    }

    async.each = function (arr, iterator, callback) {
        callback = callback || function () {};
        if (!arr.length) {
            return callback();
        }
        var completed = 0;
        _each(arr, function (x) {
            iterator(x, only_once(function (err) {
                if (err) {
                    callback(err);
                    callback = function () {};
                }
                else {
                    completed += 1;
                    if (completed >= arr.length) {
                        callback(null);
                    }
                }
            }));
        });
    };
    async.forEach = async.each;

    async.eachSeries = function (arr, iterator, callback) {
        callback = callback || function () {};
        if (!arr.length) {
            return callback();
        }
        var completed = 0;
        var iterate = function () {
            iterator(arr[completed], function (err) {
                if (err) {
                    callback(err);
                    callback = function () {};
                }
                else {
                    completed += 1;
                    if (completed >= arr.length) {
                        callback(null);
                    }
                    else {
                        iterate();
                    }
                }
            });
        };
        iterate();
    };
    async.forEachSeries = async.eachSeries;

    async.eachLimit = function (arr, limit, iterator, callback) {
        var fn = _eachLimit(limit);
        fn.apply(null, [arr, iterator, callback]);
    };
    async.forEachLimit = async.eachLimit;

    var _eachLimit = function (limit) {

        return function (arr, iterator, callback) {
            callback = callback || function () {};
            if (!arr.length || limit <= 0) {
                return callback();
            }
            var completed = 0;
            var started = 0;
            var running = 0;

            (function replenish () {
                if (completed >= arr.length) {
                    return callback();
                }

                while (running < limit && started < arr.length) {
                    started += 1;
                    running += 1;
                    iterator(arr[started - 1], function (err) {
                        if (err) {
                            callback(err);
                            callback = function () {};
                        }
                        else {
                            completed += 1;
                            running -= 1;
                            if (completed >= arr.length) {
                                callback();
                            }
                            else {
                                replenish();
                            }
                        }
                    });
                }
            })();
        };
    };


    var doParallel = function (fn) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            return fn.apply(null, [async.each].concat(args));
        };
    };
    var doParallelLimit = function(limit, fn) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            return fn.apply(null, [_eachLimit(limit)].concat(args));
        };
    };
    var doSeries = function (fn) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            return fn.apply(null, [async.eachSeries].concat(args));
        };
    };


    var _asyncMap = function (eachfn, arr, iterator, callback) {
        var results = [];
        arr = _map(arr, function (x, i) {
            return {index: i, value: x};
        });
        eachfn(arr, function (x, callback) {
            iterator(x.value, function (err, v) {
                results[x.index] = v;
                callback(err);
            });
        }, function (err) {
            callback(err, results);
        });
    };
    async.map = doParallel(_asyncMap);
    async.mapSeries = doSeries(_asyncMap);
    async.mapLimit = function (arr, limit, iterator, callback) {
        return _mapLimit(limit)(arr, iterator, callback);
    };

    var _mapLimit = function(limit) {
        return doParallelLimit(limit, _asyncMap);
    };

    // reduce only has a series version, as doing reduce in parallel won't
    // work in many situations.
    async.reduce = function (arr, memo, iterator, callback) {
        async.eachSeries(arr, function (x, callback) {
            iterator(memo, x, function (err, v) {
                memo = v;
                callback(err);
            });
        }, function (err) {
            callback(err, memo);
        });
    };
    // inject alias
    async.inject = async.reduce;
    // foldl alias
    async.foldl = async.reduce;

    async.reduceRight = function (arr, memo, iterator, callback) {
        var reversed = _map(arr, function (x) {
            return x;
        }).reverse();
        async.reduce(reversed, memo, iterator, callback);
    };
    // foldr alias
    async.foldr = async.reduceRight;

    var _filter = function (eachfn, arr, iterator, callback) {
        var results = [];
        arr = _map(arr, function (x, i) {
            return {index: i, value: x};
        });
        eachfn(arr, function (x, callback) {
            iterator(x.value, function (v) {
                if (v) {
                    results.push(x);
                }
                callback();
            });
        }, function (err) {
            callback(_map(results.sort(function (a, b) {
                return a.index - b.index;
            }), function (x) {
                return x.value;
            }));
        });
    };
    async.filter = doParallel(_filter);
    async.filterSeries = doSeries(_filter);
    // select alias
    async.select = async.filter;
    async.selectSeries = async.filterSeries;

    var _reject = function (eachfn, arr, iterator, callback) {
        var results = [];
        arr = _map(arr, function (x, i) {
            return {index: i, value: x};
        });
        eachfn(arr, function (x, callback) {
            iterator(x.value, function (v) {
                if (!v) {
                    results.push(x);
                }
                callback();
            });
        }, function (err) {
            callback(_map(results.sort(function (a, b) {
                return a.index - b.index;
            }), function (x) {
                return x.value;
            }));
        });
    };
    async.reject = doParallel(_reject);
    async.rejectSeries = doSeries(_reject);

    var _detect = function (eachfn, arr, iterator, main_callback) {
        eachfn(arr, function (x, callback) {
            iterator(x, function (result) {
                if (result) {
                    main_callback(x);
                    main_callback = function () {};
                }
                else {
                    callback();
                }
            });
        }, function (err) {
            main_callback();
        });
    };
    async.detect = doParallel(_detect);
    async.detectSeries = doSeries(_detect);

    async.some = function (arr, iterator, main_callback) {
        async.each(arr, function (x, callback) {
            iterator(x, function (v) {
                if (v) {
                    main_callback(true);
                    main_callback = function () {};
                }
                callback();
            });
        }, function (err) {
            main_callback(false);
        });
    };
    // any alias
    async.any = async.some;

    async.every = function (arr, iterator, main_callback) {
        async.each(arr, function (x, callback) {
            iterator(x, function (v) {
                if (!v) {
                    main_callback(false);
                    main_callback = function () {};
                }
                callback();
            });
        }, function (err) {
            main_callback(true);
        });
    };
    // all alias
    async.all = async.every;

    async.sortBy = function (arr, iterator, callback) {
        async.map(arr, function (x, callback) {
            iterator(x, function (err, criteria) {
                if (err) {
                    callback(err);
                }
                else {
                    callback(null, {value: x, criteria: criteria});
                }
            });
        }, function (err, results) {
            if (err) {
                return callback(err);
            }
            else {
                var fn = function (left, right) {
                    var a = left.criteria, b = right.criteria;
                    return a < b ? -1 : a > b ? 1 : 0;
                };
                callback(null, _map(results.sort(fn), function (x) {
                    return x.value;
                }));
            }
        });
    };

    async.auto = function (tasks, callback) {
        callback = callback || function () {};
        var keys = _keys(tasks);
        if (!keys.length) {
            return callback(null);
        }

        var results = {};

        var listeners = [];
        var addListener = function (fn) {
            listeners.unshift(fn);
        };
        var removeListener = function (fn) {
            for (var i = 0; i < listeners.length; i += 1) {
                if (listeners[i] === fn) {
                    listeners.splice(i, 1);
                    return;
                }
            }
        };
        var taskComplete = function () {
            _each(listeners.slice(0), function (fn) {
                fn();
            });
        };

        addListener(function () {
            if (_keys(results).length === keys.length) {
                callback(null, results);
                callback = function () {};
            }
        });

        _each(keys, function (k) {
            var task = (tasks[k] instanceof Function) ? [tasks[k]]: tasks[k];
            var taskCallback = function (err) {
                var args = Array.prototype.slice.call(arguments, 1);
                if (args.length <= 1) {
                    args = args[0];
                }
                if (err) {
                    var safeResults = {};
                    _each(_keys(results), function(rkey) {
                        safeResults[rkey] = results[rkey];
                    });
                    safeResults[k] = args;
                    callback(err, safeResults);
                    // stop subsequent errors hitting callback multiple times
                    callback = function () {};
                }
                else {
                    results[k] = args;
                    async.setImmediate(taskComplete);
                }
            };
            var requires = task.slice(0, Math.abs(task.length - 1)) || [];
            var ready = function () {
                return _reduce(requires, function (a, x) {
                    return (a && results.hasOwnProperty(x));
                }, true) && !results.hasOwnProperty(k);
            };
            if (ready()) {
                task[task.length - 1](taskCallback, results);
            }
            else {
                var listener = function () {
                    if (ready()) {
                        removeListener(listener);
                        task[task.length - 1](taskCallback, results);
                    }
                };
                addListener(listener);
            }
        });
    };

    async.waterfall = function (tasks, callback) {
        callback = callback || function () {};
        if (tasks.constructor !== Array) {
          var err = new Error('First argument to waterfall must be an array of functions');
          return callback(err);
        }
        if (!tasks.length) {
            return callback();
        }
        var wrapIterator = function (iterator) {
            return function (err) {
                if (err) {
                    callback.apply(null, arguments);
                    callback = function () {};
                }
                else {
                    var args = Array.prototype.slice.call(arguments, 1);
                    var next = iterator.next();
                    if (next) {
                        args.push(wrapIterator(next));
                    }
                    else {
                        args.push(callback);
                    }
                    async.setImmediate(function () {
                        iterator.apply(null, args);
                    });
                }
            };
        };
        wrapIterator(async.iterator(tasks))();
    };

    var _parallel = function(eachfn, tasks, callback) {
        callback = callback || function () {};
        if (tasks.constructor === Array) {
            eachfn.map(tasks, function (fn, callback) {
                if (fn) {
                    fn(function (err) {
                        var args = Array.prototype.slice.call(arguments, 1);
                        if (args.length <= 1) {
                            args = args[0];
                        }
                        callback.call(null, err, args);
                    });
                }
            }, callback);
        }
        else {
            var results = {};
            eachfn.each(_keys(tasks), function (k, callback) {
                tasks[k](function (err) {
                    var args = Array.prototype.slice.call(arguments, 1);
                    if (args.length <= 1) {
                        args = args[0];
                    }
                    results[k] = args;
                    callback(err);
                });
            }, function (err) {
                callback(err, results);
            });
        }
    };

    async.parallel = function (tasks, callback) {
        _parallel({ map: async.map, each: async.each }, tasks, callback);
    };

    async.parallelLimit = function(tasks, limit, callback) {
        _parallel({ map: _mapLimit(limit), each: _eachLimit(limit) }, tasks, callback);
    };

    async.series = function (tasks, callback) {
        callback = callback || function () {};
        if (tasks.constructor === Array) {
            async.mapSeries(tasks, function (fn, callback) {
                if (fn) {
                    fn(function (err) {
                        var args = Array.prototype.slice.call(arguments, 1);
                        if (args.length <= 1) {
                            args = args[0];
                        }
                        callback.call(null, err, args);
                    });
                }
            }, callback);
        }
        else {
            var results = {};
            async.eachSeries(_keys(tasks), function (k, callback) {
                tasks[k](function (err) {
                    var args = Array.prototype.slice.call(arguments, 1);
                    if (args.length <= 1) {
                        args = args[0];
                    }
                    results[k] = args;
                    callback(err);
                });
            }, function (err) {
                callback(err, results);
            });
        }
    };

    async.iterator = function (tasks) {
        var makeCallback = function (index) {
            var fn = function () {
                if (tasks.length) {
                    tasks[index].apply(null, arguments);
                }
                return fn.next();
            };
            fn.next = function () {
                return (index < tasks.length - 1) ? makeCallback(index + 1): null;
            };
            return fn;
        };
        return makeCallback(0);
    };

    async.apply = function (fn) {
        var args = Array.prototype.slice.call(arguments, 1);
        return function () {
            return fn.apply(
                null, args.concat(Array.prototype.slice.call(arguments))
            );
        };
    };

    var _concat = function (eachfn, arr, fn, callback) {
        var r = [];
        eachfn(arr, function (x, cb) {
            fn(x, function (err, y) {
                r = r.concat(y || []);
                cb(err);
            });
        }, function (err) {
            callback(err, r);
        });
    };
    async.concat = doParallel(_concat);
    async.concatSeries = doSeries(_concat);

    async.whilst = function (test, iterator, callback) {
        if (test()) {
            iterator(function (err) {
                if (err) {
                    return callback(err);
                }
                async.whilst(test, iterator, callback);
            });
        }
        else {
            callback();
        }
    };

    async.doWhilst = function (iterator, test, callback) {
        iterator(function (err) {
            if (err) {
                return callback(err);
            }
            if (test()) {
                async.doWhilst(iterator, test, callback);
            }
            else {
                callback();
            }
        });
    };

    async.until = function (test, iterator, callback) {
        if (!test()) {
            iterator(function (err) {
                if (err) {
                    return callback(err);
                }
                async.until(test, iterator, callback);
            });
        }
        else {
            callback();
        }
    };

    async.doUntil = function (iterator, test, callback) {
        iterator(function (err) {
            if (err) {
                return callback(err);
            }
            if (!test()) {
                async.doUntil(iterator, test, callback);
            }
            else {
                callback();
            }
        });
    };

    async.queue = function (worker, concurrency) {
        if (concurrency === undefined) {
            concurrency = 1;
        }
        function _insert(q, data, pos, callback) {
          if(data.constructor !== Array) {
              data = [data];
          }
          _each(data, function(task) {
              var item = {
                  data: task,
                  callback: typeof callback === 'function' ? callback : null
              };

              if (pos) {
                q.tasks.unshift(item);
              } else {
                q.tasks.push(item);
              }

              if (q.saturated && q.tasks.length === concurrency) {
                  q.saturated();
              }
              async.setImmediate(q.process);
          });
        }

        var workers = 0;
        var q = {
            tasks: [],
            concurrency: concurrency,
            saturated: null,
            empty: null,
            drain: null,
            push: function (data, callback) {
              _insert(q, data, false, callback);
            },
            unshift: function (data, callback) {
              _insert(q, data, true, callback);
            },
            process: function () {
                if (workers < q.concurrency && q.tasks.length) {
                    var task = q.tasks.shift();
                    if (q.empty && q.tasks.length === 0) {
                        q.empty();
                    }
                    workers += 1;
                    var next = function () {
                        workers -= 1;
                        if (task.callback) {
                            task.callback.apply(task, arguments);
                        }
                        if (q.drain && q.tasks.length + workers === 0) {
                            q.drain();
                        }
                        q.process();
                    };
                    var cb = only_once(next);
                    worker(task.data, cb);
                }
            },
            length: function () {
                return q.tasks.length;
            },
            running: function () {
                return workers;
            }
        };
        return q;
    };

    async.cargo = function (worker, payload) {
        var working     = false,
            tasks       = [];

        var cargo = {
            tasks: tasks,
            payload: payload,
            saturated: null,
            empty: null,
            drain: null,
            push: function (data, callback) {
                if(data.constructor !== Array) {
                    data = [data];
                }
                _each(data, function(task) {
                    tasks.push({
                        data: task,
                        callback: typeof callback === 'function' ? callback : null
                    });
                    if (cargo.saturated && tasks.length === payload) {
                        cargo.saturated();
                    }
                });
                async.setImmediate(cargo.process);
            },
            process: function process() {
                if (working) return;
                if (tasks.length === 0) {
                    if(cargo.drain) cargo.drain();
                    return;
                }

                var ts = typeof payload === 'number'
                            ? tasks.splice(0, payload)
                            : tasks.splice(0);

                var ds = _map(ts, function (task) {
                    return task.data;
                });

                if(cargo.empty) cargo.empty();
                working = true;
                worker(ds, function () {
                    working = false;

                    var args = arguments;
                    _each(ts, function (data) {
                        if (data.callback) {
                            data.callback.apply(null, args);
                        }
                    });

                    process();
                });
            },
            length: function () {
                return tasks.length;
            },
            running: function () {
                return working;
            }
        };
        return cargo;
    };

    var _console_fn = function (name) {
        return function (fn) {
            var args = Array.prototype.slice.call(arguments, 1);
            fn.apply(null, args.concat([function (err) {
                var args = Array.prototype.slice.call(arguments, 1);
                if (typeof console !== 'undefined') {
                    if (err) {
                        if (console.error) {
                            console.error(err);
                        }
                    }
                    else if (console[name]) {
                        _each(args, function (x) {
                            console[name](x);
                        });
                    }
                }
            }]));
        };
    };
    async.log = _console_fn('log');
    async.dir = _console_fn('dir');
    /*async.info = _console_fn('info');
    async.warn = _console_fn('warn');
    async.error = _console_fn('error');*/

    async.memoize = function (fn, hasher) {
        var memo = {};
        var queues = {};
        hasher = hasher || function (x) {
            return x;
        };
        var memoized = function () {
            var args = Array.prototype.slice.call(arguments);
            var callback = args.pop();
            var key = hasher.apply(null, args);
            if (key in memo) {
                callback.apply(null, memo[key]);
            }
            else if (key in queues) {
                queues[key].push(callback);
            }
            else {
                queues[key] = [callback];
                fn.apply(null, args.concat([function () {
                    memo[key] = arguments;
                    var q = queues[key];
                    delete queues[key];
                    for (var i = 0, l = q.length; i < l; i++) {
                      q[i].apply(null, arguments);
                    }
                }]));
            }
        };
        memoized.memo = memo;
        memoized.unmemoized = fn;
        return memoized;
    };

    async.unmemoize = function (fn) {
      return function () {
        return (fn.unmemoized || fn).apply(null, arguments);
      };
    };

    async.times = function (count, iterator, callback) {
        var counter = [];
        for (var i = 0; i < count; i++) {
            counter.push(i);
        }
        return async.map(counter, iterator, callback);
    };

    async.timesSeries = function (count, iterator, callback) {
        var counter = [];
        for (var i = 0; i < count; i++) {
            counter.push(i);
        }
        return async.mapSeries(counter, iterator, callback);
    };

    async.compose = function (/* functions... */) {
        var fns = Array.prototype.reverse.call(arguments);
        return function () {
            var that = this;
            var args = Array.prototype.slice.call(arguments);
            var callback = args.pop();
            async.reduce(fns, args, function (newargs, fn, cb) {
                fn.apply(that, newargs.concat([function () {
                    var err = arguments[0];
                    var nextargs = Array.prototype.slice.call(arguments, 1);
                    cb(err, nextargs);
                }]))
            },
            function (err, results) {
                callback.apply(that, [err].concat(results));
            });
        };
    };

    var _applyEach = function (eachfn, fns /*args...*/) {
        var go = function () {
            var that = this;
            var args = Array.prototype.slice.call(arguments);
            var callback = args.pop();
            return eachfn(fns, function (fn, cb) {
                fn.apply(that, args.concat([cb]));
            },
            callback);
        };
        if (arguments.length > 2) {
            var args = Array.prototype.slice.call(arguments, 2);
            return go.apply(this, args);
        }
        else {
            return go;
        }
    };
    async.applyEach = doParallel(_applyEach);
    async.applyEachSeries = doSeries(_applyEach);

    async.forever = function (fn, callback) {
        function next(err) {
            if (err) {
                if (callback) {
                    return callback(err);
                }
                throw err;
            }
            fn(next);
        }
        next();
    };

    // AMD / RequireJS
    if (typeof define !== 'undefined' && define.amd) {
        define([], function () {
            return async;
        });
    }
    // Node.js
    else if (typeof module !== 'undefined' && module.exports) {
        module.exports = async;
    }
    // included directly via <script> tag
    else {
        root.async = async;
    }

}());

}).call(this,require('_process'))
},{"_process":37}],36:[function(require,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length - 1; i >= 0; i--) {
    var last = parts[i];
    if (last === '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Split a filename into [root, dir, basename, ext], unix version
// 'root' is just a slash, or nothing.
var splitPathRe =
    /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
var splitPath = function(filename) {
  return splitPathRe.exec(filename).slice(1);
};

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
  var resolvedPath = '',
      resolvedAbsolute = false;

  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    var path = (i >= 0) ? arguments[i] : process.cwd();

    // Skip empty and invalid entries
    if (typeof path !== 'string') {
      throw new TypeError('Arguments to path.resolve must be strings');
    } else if (!path) {
      continue;
    }

    resolvedPath = path + '/' + resolvedPath;
    resolvedAbsolute = path.charAt(0) === '/';
  }

  // At this point the path should be resolved to a full absolute path, but
  // handle relative paths to be safe (might happen when process.cwd() fails)

  // Normalize the path
  resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
  var isAbsolute = exports.isAbsolute(path),
      trailingSlash = substr(path, -1) === '/';

  // Normalize the path
  path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }

  return (isAbsolute ? '/' : '') + path;
};

// posix version
exports.isAbsolute = function(path) {
  return path.charAt(0) === '/';
};

// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    if (typeof p !== 'string') {
      throw new TypeError('Arguments to path.join must be strings');
    }
    return p;
  }).join('/'));
};


// path.relative(from, to)
// posix version
exports.relative = function(from, to) {
  from = exports.resolve(from).substr(1);
  to = exports.resolve(to).substr(1);

  function trim(arr) {
    var start = 0;
    for (; start < arr.length; start++) {
      if (arr[start] !== '') break;
    }

    var end = arr.length - 1;
    for (; end >= 0; end--) {
      if (arr[end] !== '') break;
    }

    if (start > end) return [];
    return arr.slice(start, end - start + 1);
  }

  var fromParts = trim(from.split('/'));
  var toParts = trim(to.split('/'));

  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
    if (fromParts[i] !== toParts[i]) {
      samePartsLength = i;
      break;
    }
  }

  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
    outputParts.push('..');
  }

  outputParts = outputParts.concat(toParts.slice(samePartsLength));

  return outputParts.join('/');
};

exports.sep = '/';
exports.delimiter = ':';

exports.dirname = function(path) {
  var result = splitPath(path),
      root = result[0],
      dir = result[1];

  if (!root && !dir) {
    // No dirname whatsoever
    return '.';
  }

  if (dir) {
    // It has a dirname, strip trailing slash
    dir = dir.substr(0, dir.length - 1);
  }

  return root + dir;
};


exports.basename = function(path, ext) {
  var f = splitPath(path)[2];
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPath(path)[3];
};

function filter (xs, f) {
    if (xs.filter) return xs.filter(f);
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (f(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// String.prototype.substr - negative index don't work in IE8
var substr = 'ab'.substr(-1) === 'b'
    ? function (str, start, len) { return str.substr(start, len) }
    : function (str, start, len) {
        if (start < 0) start = str.length + start;
        return str.substr(start, len);
    }
;

}).call(this,require('_process'))
},{"_process":37}],37:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],38:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

// If obj.hasOwnProperty has been overridden, then calling
// obj.hasOwnProperty(prop) will break.
// See: https://github.com/joyent/node/issues/1707
function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

module.exports = function(qs, sep, eq, options) {
  sep = sep || '&';
  eq = eq || '=';
  var obj = {};

  if (typeof qs !== 'string' || qs.length === 0) {
    return obj;
  }

  var regexp = /\+/g;
  qs = qs.split(sep);

  var maxKeys = 1000;
  if (options && typeof options.maxKeys === 'number') {
    maxKeys = options.maxKeys;
  }

  var len = qs.length;
  // maxKeys <= 0 means that we should not limit keys count
  if (maxKeys > 0 && len > maxKeys) {
    len = maxKeys;
  }

  for (var i = 0; i < len; ++i) {
    var x = qs[i].replace(regexp, '%20'),
        idx = x.indexOf(eq),
        kstr, vstr, k, v;

    if (idx >= 0) {
      kstr = x.substr(0, idx);
      vstr = x.substr(idx + 1);
    } else {
      kstr = x;
      vstr = '';
    }

    k = decodeURIComponent(kstr);
    v = decodeURIComponent(vstr);

    if (!hasOwnProperty(obj, k)) {
      obj[k] = v;
    } else if (isArray(obj[k])) {
      obj[k].push(v);
    } else {
      obj[k] = [obj[k], v];
    }
  }

  return obj;
};

var isArray = Array.isArray || function (xs) {
  return Object.prototype.toString.call(xs) === '[object Array]';
};

},{}],39:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

var stringifyPrimitive = function(v) {
  switch (typeof v) {
    case 'string':
      return v;

    case 'boolean':
      return v ? 'true' : 'false';

    case 'number':
      return isFinite(v) ? v : '';

    default:
      return '';
  }
};

module.exports = function(obj, sep, eq, name) {
  sep = sep || '&';
  eq = eq || '=';
  if (obj === null) {
    obj = undefined;
  }

  if (typeof obj === 'object') {
    return map(objectKeys(obj), function(k) {
      var ks = encodeURIComponent(stringifyPrimitive(k)) + eq;
      if (isArray(obj[k])) {
        return map(obj[k], function(v) {
          return ks + encodeURIComponent(stringifyPrimitive(v));
        }).join(sep);
      } else {
        return ks + encodeURIComponent(stringifyPrimitive(obj[k]));
      }
    }).join(sep);

  }

  if (!name) return '';
  return encodeURIComponent(stringifyPrimitive(name)) + eq +
         encodeURIComponent(stringifyPrimitive(obj));
};

var isArray = Array.isArray || function (xs) {
  return Object.prototype.toString.call(xs) === '[object Array]';
};

function map (xs, f) {
  if (xs.map) return xs.map(f);
  var res = [];
  for (var i = 0; i < xs.length; i++) {
    res.push(f(xs[i], i));
  }
  return res;
}

var objectKeys = Object.keys || function (obj) {
  var res = [];
  for (var key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) res.push(key);
  }
  return res;
};

},{}],40:[function(require,module,exports){
'use strict';

exports.decode = exports.parse = require('./decode');
exports.encode = exports.stringify = require('./encode');

},{"./decode":38,"./encode":39}],41:[function(require,module,exports){

var Promise = require('any-promise')
var assert = require('assert')

module.exports = thenify

/**
 * Turn async functions into promises
 *
 * @param {Function} $$__fn__$$
 * @return {Function}
 * @api public
 */

function thenify($$__fn__$$, options) {
  assert(typeof $$__fn__$$ === 'function')
  return eval(createWrapper($$__fn__$$.name, options))
}

/**
 * Turn async functions into promises and backward compatible with callback
 *
 * @param {Function} $$__fn__$$
 * @return {Function}
 * @api public
 */

thenify.withCallback = function ($$__fn__$$, options) {
  assert(typeof $$__fn__$$ === 'function')
  options = options || {}
  options.withCallback = true
  if (options.multiArgs === undefined) options.multiArgs = true
  return eval(createWrapper($$__fn__$$.name, options))
}

function createCallback(resolve, reject, multiArgs) {
  return function(err, value) {
    if (err) return reject(err)
    var length = arguments.length

    if (length <= 2 || !multiArgs) return resolve(value)

    if (Array.isArray(multiArgs)) {
      var values = {}
      for (var i = 1; i < length; i++) values[multiArgs[i - 1]] = arguments[i]
      return resolve(values)
    }

    var values = new Array(length - 1)
    for (var i = 1; i < length; ++i) values[i - 1] = arguments[i]
    resolve(values)
  }
}

function createWrapper(name, options) {
  name = (name || '').replace(/\s|bound(?!$)/g, '')
  options = options || {}
  // default to true
  var multiArgs = options.multiArgs !== undefined ? options.multiArgs : true
  multiArgs = 'var multiArgs = ' + JSON.stringify(multiArgs) + '\n'

  var withCallback = options.withCallback ?
    'var lastType = typeof arguments[len - 1]\n'
    + 'if (lastType === "function") return $$__fn__$$.apply(self, arguments)\n'
   : ''

  return '(function ' + name + '() {\n'
    + 'var self = this\n'
    + 'var len = arguments.length\n'
    + multiArgs
    + withCallback
    + 'var args = new Array(len + 1)\n'
    + 'for (var i = 0; i < len; ++i) args[i] = arguments[i]\n'
    + 'var lastIndex = i\n'
    + 'return new Promise(function (resolve, reject) {\n'
      + 'args[lastIndex] = createCallback(resolve, reject, multiArgs)\n'
      + '$$__fn__$$.apply(self, args)\n'
    + '})\n'
  + '})'
}

},{"any-promise":15,"assert":18}],42:[function(require,module,exports){
//     Underscore.js 1.4.4
//     http://underscorejs.org
//     (c) 2009-2013 Jeremy Ashkenas, DocumentCloud Inc.
//     Underscore may be freely distributed under the MIT license.

(function() {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `global` on the server.
  var root = this;

  // Save the previous value of the `_` variable.
  var previousUnderscore = root._;

  // Establish the object that gets returned to break out of a loop iteration.
  var breaker = {};

  // Save bytes in the minified (but not gzipped) version:
  var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

  // Create quick reference variables for speed access to core prototypes.
  var push             = ArrayProto.push,
      slice            = ArrayProto.slice,
      concat           = ArrayProto.concat,
      toString         = ObjProto.toString,
      hasOwnProperty   = ObjProto.hasOwnProperty;

  // All **ECMAScript 5** native function implementations that we hope to use
  // are declared here.
  var
    nativeForEach      = ArrayProto.forEach,
    nativeMap          = ArrayProto.map,
    nativeReduce       = ArrayProto.reduce,
    nativeReduceRight  = ArrayProto.reduceRight,
    nativeFilter       = ArrayProto.filter,
    nativeEvery        = ArrayProto.every,
    nativeSome         = ArrayProto.some,
    nativeIndexOf      = ArrayProto.indexOf,
    nativeLastIndexOf  = ArrayProto.lastIndexOf,
    nativeIsArray      = Array.isArray,
    nativeKeys         = Object.keys,
    nativeBind         = FuncProto.bind;

  // Create a safe reference to the Underscore object for use below.
  var _ = function(obj) {
    if (obj instanceof _) return obj;
    if (!(this instanceof _)) return new _(obj);
    this._wrapped = obj;
  };

  // Export the Underscore object for **Node.js**, with
  // backwards-compatibility for the old `require()` API. If we're in
  // the browser, add `_` as a global object via a string identifier,
  // for Closure Compiler "advanced" mode.
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = _;
    }
    exports._ = _;
  } else {
    root._ = _;
  }

  // Current version.
  _.VERSION = '1.4.4';

  // Collection Functions
  // --------------------

  // The cornerstone, an `each` implementation, aka `forEach`.
  // Handles objects with the built-in `forEach`, arrays, and raw objects.
  // Delegates to **ECMAScript 5**'s native `forEach` if available.
  var each = _.each = _.forEach = function(obj, iterator, context) {
    if (obj == null) return;
    if (nativeForEach && obj.forEach === nativeForEach) {
      obj.forEach(iterator, context);
    } else if (obj.length === +obj.length) {
      for (var i = 0, l = obj.length; i < l; i++) {
        if (iterator.call(context, obj[i], i, obj) === breaker) return;
      }
    } else {
      for (var key in obj) {
        if (_.has(obj, key)) {
          if (iterator.call(context, obj[key], key, obj) === breaker) return;
        }
      }
    }
  };

  // Return the results of applying the iterator to each element.
  // Delegates to **ECMAScript 5**'s native `map` if available.
  _.map = _.collect = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeMap && obj.map === nativeMap) return obj.map(iterator, context);
    each(obj, function(value, index, list) {
      results[results.length] = iterator.call(context, value, index, list);
    });
    return results;
  };

  var reduceError = 'Reduce of empty array with no initial value';

  // **Reduce** builds up a single result from a list of values, aka `inject`,
  // or `foldl`. Delegates to **ECMAScript 5**'s native `reduce` if available.
  _.reduce = _.foldl = _.inject = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduce && obj.reduce === nativeReduce) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduce(iterator, memo) : obj.reduce(iterator);
    }
    each(obj, function(value, index, list) {
      if (!initial) {
        memo = value;
        initial = true;
      } else {
        memo = iterator.call(context, memo, value, index, list);
      }
    });
    if (!initial) throw new TypeError(reduceError);
    return memo;
  };

  // The right-associative version of reduce, also known as `foldr`.
  // Delegates to **ECMAScript 5**'s native `reduceRight` if available.
  _.reduceRight = _.foldr = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduceRight && obj.reduceRight === nativeReduceRight) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduceRight(iterator, memo) : obj.reduceRight(iterator);
    }
    var length = obj.length;
    if (length !== +length) {
      var keys = _.keys(obj);
      length = keys.length;
    }
    each(obj, function(value, index, list) {
      index = keys ? keys[--length] : --length;
      if (!initial) {
        memo = obj[index];
        initial = true;
      } else {
        memo = iterator.call(context, memo, obj[index], index, list);
      }
    });
    if (!initial) throw new TypeError(reduceError);
    return memo;
  };

  // Return the first value which passes a truth test. Aliased as `detect`.
  _.find = _.detect = function(obj, iterator, context) {
    var result;
    any(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)) {
        result = value;
        return true;
      }
    });
    return result;
  };

  // Return all the elements that pass a truth test.
  // Delegates to **ECMAScript 5**'s native `filter` if available.
  // Aliased as `select`.
  _.filter = _.select = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeFilter && obj.filter === nativeFilter) return obj.filter(iterator, context);
    each(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)) results[results.length] = value;
    });
    return results;
  };

  // Return all the elements for which a truth test fails.
  _.reject = function(obj, iterator, context) {
    return _.filter(obj, function(value, index, list) {
      return !iterator.call(context, value, index, list);
    }, context);
  };

  // Determine whether all of the elements match a truth test.
  // Delegates to **ECMAScript 5**'s native `every` if available.
  // Aliased as `all`.
  _.every = _.all = function(obj, iterator, context) {
    iterator || (iterator = _.identity);
    var result = true;
    if (obj == null) return result;
    if (nativeEvery && obj.every === nativeEvery) return obj.every(iterator, context);
    each(obj, function(value, index, list) {
      if (!(result = result && iterator.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if at least one element in the object matches a truth test.
  // Delegates to **ECMAScript 5**'s native `some` if available.
  // Aliased as `any`.
  var any = _.some = _.any = function(obj, iterator, context) {
    iterator || (iterator = _.identity);
    var result = false;
    if (obj == null) return result;
    if (nativeSome && obj.some === nativeSome) return obj.some(iterator, context);
    each(obj, function(value, index, list) {
      if (result || (result = iterator.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if the array or object contains a given value (using `===`).
  // Aliased as `include`.
  _.contains = _.include = function(obj, target) {
    if (obj == null) return false;
    if (nativeIndexOf && obj.indexOf === nativeIndexOf) return obj.indexOf(target) != -1;
    return any(obj, function(value) {
      return value === target;
    });
  };

  // Invoke a method (with arguments) on every item in a collection.
  _.invoke = function(obj, method) {
    var args = slice.call(arguments, 2);
    var isFunc = _.isFunction(method);
    return _.map(obj, function(value) {
      return (isFunc ? method : value[method]).apply(value, args);
    });
  };

  // Convenience version of a common use case of `map`: fetching a property.
  _.pluck = function(obj, key) {
    return _.map(obj, function(value){ return value[key]; });
  };

  // Convenience version of a common use case of `filter`: selecting only objects
  // containing specific `key:value` pairs.
  _.where = function(obj, attrs, first) {
    if (_.isEmpty(attrs)) return first ? null : [];
    return _[first ? 'find' : 'filter'](obj, function(value) {
      for (var key in attrs) {
        if (attrs[key] !== value[key]) return false;
      }
      return true;
    });
  };

  // Convenience version of a common use case of `find`: getting the first object
  // containing specific `key:value` pairs.
  _.findWhere = function(obj, attrs) {
    return _.where(obj, attrs, true);
  };

  // Return the maximum element or (element-based computation).
  // Can't optimize arrays of integers longer than 65,535 elements.
  // See: https://bugs.webkit.org/show_bug.cgi?id=80797
  _.max = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.max.apply(Math, obj);
    }
    if (!iterator && _.isEmpty(obj)) return -Infinity;
    var result = {computed : -Infinity, value: -Infinity};
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      computed >= result.computed && (result = {value : value, computed : computed});
    });
    return result.value;
  };

  // Return the minimum element (or element-based computation).
  _.min = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.min.apply(Math, obj);
    }
    if (!iterator && _.isEmpty(obj)) return Infinity;
    var result = {computed : Infinity, value: Infinity};
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      computed < result.computed && (result = {value : value, computed : computed});
    });
    return result.value;
  };

  // Shuffle an array.
  _.shuffle = function(obj) {
    var rand;
    var index = 0;
    var shuffled = [];
    each(obj, function(value) {
      rand = _.random(index++);
      shuffled[index - 1] = shuffled[rand];
      shuffled[rand] = value;
    });
    return shuffled;
  };

  // An internal function to generate lookup iterators.
  var lookupIterator = function(value) {
    return _.isFunction(value) ? value : function(obj){ return obj[value]; };
  };

  // Sort the object's values by a criterion produced by an iterator.
  _.sortBy = function(obj, value, context) {
    var iterator = lookupIterator(value);
    return _.pluck(_.map(obj, function(value, index, list) {
      return {
        value : value,
        index : index,
        criteria : iterator.call(context, value, index, list)
      };
    }).sort(function(left, right) {
      var a = left.criteria;
      var b = right.criteria;
      if (a !== b) {
        if (a > b || a === void 0) return 1;
        if (a < b || b === void 0) return -1;
      }
      return left.index < right.index ? -1 : 1;
    }), 'value');
  };

  // An internal function used for aggregate "group by" operations.
  var group = function(obj, value, context, behavior) {
    var result = {};
    var iterator = lookupIterator(value || _.identity);
    each(obj, function(value, index) {
      var key = iterator.call(context, value, index, obj);
      behavior(result, key, value);
    });
    return result;
  };

  // Groups the object's values by a criterion. Pass either a string attribute
  // to group by, or a function that returns the criterion.
  _.groupBy = function(obj, value, context) {
    return group(obj, value, context, function(result, key, value) {
      (_.has(result, key) ? result[key] : (result[key] = [])).push(value);
    });
  };

  // Counts instances of an object that group by a certain criterion. Pass
  // either a string attribute to count by, or a function that returns the
  // criterion.
  _.countBy = function(obj, value, context) {
    return group(obj, value, context, function(result, key) {
      if (!_.has(result, key)) result[key] = 0;
      result[key]++;
    });
  };

  // Use a comparator function to figure out the smallest index at which
  // an object should be inserted so as to maintain order. Uses binary search.
  _.sortedIndex = function(array, obj, iterator, context) {
    iterator = iterator == null ? _.identity : lookupIterator(iterator);
    var value = iterator.call(context, obj);
    var low = 0, high = array.length;
    while (low < high) {
      var mid = (low + high) >>> 1;
      iterator.call(context, array[mid]) < value ? low = mid + 1 : high = mid;
    }
    return low;
  };

  // Safely convert anything iterable into a real, live array.
  _.toArray = function(obj) {
    if (!obj) return [];
    if (_.isArray(obj)) return slice.call(obj);
    if (obj.length === +obj.length) return _.map(obj, _.identity);
    return _.values(obj);
  };

  // Return the number of elements in an object.
  _.size = function(obj) {
    if (obj == null) return 0;
    return (obj.length === +obj.length) ? obj.length : _.keys(obj).length;
  };

  // Array Functions
  // ---------------

  // Get the first element of an array. Passing **n** will return the first N
  // values in the array. Aliased as `head` and `take`. The **guard** check
  // allows it to work with `_.map`.
  _.first = _.head = _.take = function(array, n, guard) {
    if (array == null) return void 0;
    return (n != null) && !guard ? slice.call(array, 0, n) : array[0];
  };

  // Returns everything but the last entry of the array. Especially useful on
  // the arguments object. Passing **n** will return all the values in
  // the array, excluding the last N. The **guard** check allows it to work with
  // `_.map`.
  _.initial = function(array, n, guard) {
    return slice.call(array, 0, array.length - ((n == null) || guard ? 1 : n));
  };

  // Get the last element of an array. Passing **n** will return the last N
  // values in the array. The **guard** check allows it to work with `_.map`.
  _.last = function(array, n, guard) {
    if (array == null) return void 0;
    if ((n != null) && !guard) {
      return slice.call(array, Math.max(array.length - n, 0));
    } else {
      return array[array.length - 1];
    }
  };

  // Returns everything but the first entry of the array. Aliased as `tail` and `drop`.
  // Especially useful on the arguments object. Passing an **n** will return
  // the rest N values in the array. The **guard**
  // check allows it to work with `_.map`.
  _.rest = _.tail = _.drop = function(array, n, guard) {
    return slice.call(array, (n == null) || guard ? 1 : n);
  };

  // Trim out all falsy values from an array.
  _.compact = function(array) {
    return _.filter(array, _.identity);
  };

  // Internal implementation of a recursive `flatten` function.
  var flatten = function(input, shallow, output) {
    each(input, function(value) {
      if (_.isArray(value)) {
        shallow ? push.apply(output, value) : flatten(value, shallow, output);
      } else {
        output.push(value);
      }
    });
    return output;
  };

  // Return a completely flattened version of an array.
  _.flatten = function(array, shallow) {
    return flatten(array, shallow, []);
  };

  // Return a version of the array that does not contain the specified value(s).
  _.without = function(array) {
    return _.difference(array, slice.call(arguments, 1));
  };

  // Produce a duplicate-free version of the array. If the array has already
  // been sorted, you have the option of using a faster algorithm.
  // Aliased as `unique`.
  _.uniq = _.unique = function(array, isSorted, iterator, context) {
    if (_.isFunction(isSorted)) {
      context = iterator;
      iterator = isSorted;
      isSorted = false;
    }
    var initial = iterator ? _.map(array, iterator, context) : array;
    var results = [];
    var seen = [];
    each(initial, function(value, index) {
      if (isSorted ? (!index || seen[seen.length - 1] !== value) : !_.contains(seen, value)) {
        seen.push(value);
        results.push(array[index]);
      }
    });
    return results;
  };

  // Produce an array that contains the union: each distinct element from all of
  // the passed-in arrays.
  _.union = function() {
    return _.uniq(concat.apply(ArrayProto, arguments));
  };

  // Produce an array that contains every item shared between all the
  // passed-in arrays.
  _.intersection = function(array) {
    var rest = slice.call(arguments, 1);
    return _.filter(_.uniq(array), function(item) {
      return _.every(rest, function(other) {
        return _.indexOf(other, item) >= 0;
      });
    });
  };

  // Take the difference between one array and a number of other arrays.
  // Only the elements present in just the first array will remain.
  _.difference = function(array) {
    var rest = concat.apply(ArrayProto, slice.call(arguments, 1));
    return _.filter(array, function(value){ return !_.contains(rest, value); });
  };

  // Zip together multiple lists into a single array -- elements that share
  // an index go together.
  _.zip = function() {
    var args = slice.call(arguments);
    var length = _.max(_.pluck(args, 'length'));
    var results = new Array(length);
    for (var i = 0; i < length; i++) {
      results[i] = _.pluck(args, "" + i);
    }
    return results;
  };

  // Converts lists into objects. Pass either a single array of `[key, value]`
  // pairs, or two parallel arrays of the same length -- one of keys, and one of
  // the corresponding values.
  _.object = function(list, values) {
    if (list == null) return {};
    var result = {};
    for (var i = 0, l = list.length; i < l; i++) {
      if (values) {
        result[list[i]] = values[i];
      } else {
        result[list[i][0]] = list[i][1];
      }
    }
    return result;
  };

  // If the browser doesn't supply us with indexOf (I'm looking at you, **MSIE**),
  // we need this function. Return the position of the first occurrence of an
  // item in an array, or -1 if the item is not included in the array.
  // Delegates to **ECMAScript 5**'s native `indexOf` if available.
  // If the array is large and already in sort order, pass `true`
  // for **isSorted** to use binary search.
  _.indexOf = function(array, item, isSorted) {
    if (array == null) return -1;
    var i = 0, l = array.length;
    if (isSorted) {
      if (typeof isSorted == 'number') {
        i = (isSorted < 0 ? Math.max(0, l + isSorted) : isSorted);
      } else {
        i = _.sortedIndex(array, item);
        return array[i] === item ? i : -1;
      }
    }
    if (nativeIndexOf && array.indexOf === nativeIndexOf) return array.indexOf(item, isSorted);
    for (; i < l; i++) if (array[i] === item) return i;
    return -1;
  };

  // Delegates to **ECMAScript 5**'s native `lastIndexOf` if available.
  _.lastIndexOf = function(array, item, from) {
    if (array == null) return -1;
    var hasIndex = from != null;
    if (nativeLastIndexOf && array.lastIndexOf === nativeLastIndexOf) {
      return hasIndex ? array.lastIndexOf(item, from) : array.lastIndexOf(item);
    }
    var i = (hasIndex ? from : array.length);
    while (i--) if (array[i] === item) return i;
    return -1;
  };

  // Generate an integer Array containing an arithmetic progression. A port of
  // the native Python `range()` function. See
  // [the Python documentation](http://docs.python.org/library/functions.html#range).
  _.range = function(start, stop, step) {
    if (arguments.length <= 1) {
      stop = start || 0;
      start = 0;
    }
    step = arguments[2] || 1;

    var len = Math.max(Math.ceil((stop - start) / step), 0);
    var idx = 0;
    var range = new Array(len);

    while(idx < len) {
      range[idx++] = start;
      start += step;
    }

    return range;
  };

  // Function (ahem) Functions
  // ------------------

  // Create a function bound to a given object (assigning `this`, and arguments,
  // optionally). Delegates to **ECMAScript 5**'s native `Function.bind` if
  // available.
  _.bind = function(func, context) {
    if (func.bind === nativeBind && nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
    var args = slice.call(arguments, 2);
    return function() {
      return func.apply(context, args.concat(slice.call(arguments)));
    };
  };

  // Partially apply a function by creating a version that has had some of its
  // arguments pre-filled, without changing its dynamic `this` context.
  _.partial = function(func) {
    var args = slice.call(arguments, 1);
    return function() {
      return func.apply(this, args.concat(slice.call(arguments)));
    };
  };

  // Bind all of an object's methods to that object. Useful for ensuring that
  // all callbacks defined on an object belong to it.
  _.bindAll = function(obj) {
    var funcs = slice.call(arguments, 1);
    if (funcs.length === 0) funcs = _.functions(obj);
    each(funcs, function(f) { obj[f] = _.bind(obj[f], obj); });
    return obj;
  };

  // Memoize an expensive function by storing its results.
  _.memoize = function(func, hasher) {
    var memo = {};
    hasher || (hasher = _.identity);
    return function() {
      var key = hasher.apply(this, arguments);
      return _.has(memo, key) ? memo[key] : (memo[key] = func.apply(this, arguments));
    };
  };

  // Delays a function for the given number of milliseconds, and then calls
  // it with the arguments supplied.
  _.delay = function(func, wait) {
    var args = slice.call(arguments, 2);
    return setTimeout(function(){ return func.apply(null, args); }, wait);
  };

  // Defers a function, scheduling it to run after the current call stack has
  // cleared.
  _.defer = function(func) {
    return _.delay.apply(_, [func, 1].concat(slice.call(arguments, 1)));
  };

  // Returns a function, that, when invoked, will only be triggered at most once
  // during a given window of time.
  _.throttle = function(func, wait) {
    var context, args, timeout, result;
    var previous = 0;
    var later = function() {
      previous = new Date;
      timeout = null;
      result = func.apply(context, args);
    };
    return function() {
      var now = new Date;
      var remaining = wait - (now - previous);
      context = this;
      args = arguments;
      if (remaining <= 0) {
        clearTimeout(timeout);
        timeout = null;
        previous = now;
        result = func.apply(context, args);
      } else if (!timeout) {
        timeout = setTimeout(later, remaining);
      }
      return result;
    };
  };

  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  _.debounce = function(func, wait, immediate) {
    var timeout, result;
    return function() {
      var context = this, args = arguments;
      var later = function() {
        timeout = null;
        if (!immediate) result = func.apply(context, args);
      };
      var callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) result = func.apply(context, args);
      return result;
    };
  };

  // Returns a function that will be executed at most one time, no matter how
  // often you call it. Useful for lazy initialization.
  _.once = function(func) {
    var ran = false, memo;
    return function() {
      if (ran) return memo;
      ran = true;
      memo = func.apply(this, arguments);
      func = null;
      return memo;
    };
  };

  // Returns the first function passed as an argument to the second,
  // allowing you to adjust arguments, run code before and after, and
  // conditionally execute the original function.
  _.wrap = function(func, wrapper) {
    return function() {
      var args = [func];
      push.apply(args, arguments);
      return wrapper.apply(this, args);
    };
  };

  // Returns a function that is the composition of a list of functions, each
  // consuming the return value of the function that follows.
  _.compose = function() {
    var funcs = arguments;
    return function() {
      var args = arguments;
      for (var i = funcs.length - 1; i >= 0; i--) {
        args = [funcs[i].apply(this, args)];
      }
      return args[0];
    };
  };

  // Returns a function that will only be executed after being called N times.
  _.after = function(times, func) {
    if (times <= 0) return func();
    return function() {
      if (--times < 1) {
        return func.apply(this, arguments);
      }
    };
  };

  // Object Functions
  // ----------------

  // Retrieve the names of an object's properties.
  // Delegates to **ECMAScript 5**'s native `Object.keys`
  _.keys = nativeKeys || function(obj) {
    if (obj !== Object(obj)) throw new TypeError('Invalid object');
    var keys = [];
    for (var key in obj) if (_.has(obj, key)) keys[keys.length] = key;
    return keys;
  };

  // Retrieve the values of an object's properties.
  _.values = function(obj) {
    var values = [];
    for (var key in obj) if (_.has(obj, key)) values.push(obj[key]);
    return values;
  };

  // Convert an object into a list of `[key, value]` pairs.
  _.pairs = function(obj) {
    var pairs = [];
    for (var key in obj) if (_.has(obj, key)) pairs.push([key, obj[key]]);
    return pairs;
  };

  // Invert the keys and values of an object. The values must be serializable.
  _.invert = function(obj) {
    var result = {};
    for (var key in obj) if (_.has(obj, key)) result[obj[key]] = key;
    return result;
  };

  // Return a sorted list of the function names available on the object.
  // Aliased as `methods`
  _.functions = _.methods = function(obj) {
    var names = [];
    for (var key in obj) {
      if (_.isFunction(obj[key])) names.push(key);
    }
    return names.sort();
  };

  // Extend a given object with all the properties in passed-in object(s).
  _.extend = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          obj[prop] = source[prop];
        }
      }
    });
    return obj;
  };

  // Return a copy of the object only containing the whitelisted properties.
  _.pick = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    each(keys, function(key) {
      if (key in obj) copy[key] = obj[key];
    });
    return copy;
  };

   // Return a copy of the object without the blacklisted properties.
  _.omit = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    for (var key in obj) {
      if (!_.contains(keys, key)) copy[key] = obj[key];
    }
    return copy;
  };

  // Fill in a given object with default properties.
  _.defaults = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          if (obj[prop] == null) obj[prop] = source[prop];
        }
      }
    });
    return obj;
  };

  // Create a (shallow-cloned) duplicate of an object.
  _.clone = function(obj) {
    if (!_.isObject(obj)) return obj;
    return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
  };

  // Invokes interceptor with the obj, and then returns obj.
  // The primary purpose of this method is to "tap into" a method chain, in
  // order to perform operations on intermediate results within the chain.
  _.tap = function(obj, interceptor) {
    interceptor(obj);
    return obj;
  };

  // Internal recursive comparison function for `isEqual`.
  var eq = function(a, b, aStack, bStack) {
    // Identical objects are equal. `0 === -0`, but they aren't identical.
    // See the Harmony `egal` proposal: http://wiki.ecmascript.org/doku.php?id=harmony:egal.
    if (a === b) return a !== 0 || 1 / a == 1 / b;
    // A strict comparison is necessary because `null == undefined`.
    if (a == null || b == null) return a === b;
    // Unwrap any wrapped objects.
    if (a instanceof _) a = a._wrapped;
    if (b instanceof _) b = b._wrapped;
    // Compare `[[Class]]` names.
    var className = toString.call(a);
    if (className != toString.call(b)) return false;
    switch (className) {
      // Strings, numbers, dates, and booleans are compared by value.
      case '[object String]':
        // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
        // equivalent to `new String("5")`.
        return a == String(b);
      case '[object Number]':
        // `NaN`s are equivalent, but non-reflexive. An `egal` comparison is performed for
        // other numeric values.
        return a != +a ? b != +b : (a == 0 ? 1 / a == 1 / b : a == +b);
      case '[object Date]':
      case '[object Boolean]':
        // Coerce dates and booleans to numeric primitive values. Dates are compared by their
        // millisecond representations. Note that invalid dates with millisecond representations
        // of `NaN` are not equivalent.
        return +a == +b;
      // RegExps are compared by their source patterns and flags.
      case '[object RegExp]':
        return a.source == b.source &&
               a.global == b.global &&
               a.multiline == b.multiline &&
               a.ignoreCase == b.ignoreCase;
    }
    if (typeof a != 'object' || typeof b != 'object') return false;
    // Assume equality for cyclic structures. The algorithm for detecting cyclic
    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.
    var length = aStack.length;
    while (length--) {
      // Linear search. Performance is inversely proportional to the number of
      // unique nested structures.
      if (aStack[length] == a) return bStack[length] == b;
    }
    // Add the first object to the stack of traversed objects.
    aStack.push(a);
    bStack.push(b);
    var size = 0, result = true;
    // Recursively compare objects and arrays.
    if (className == '[object Array]') {
      // Compare array lengths to determine if a deep comparison is necessary.
      size = a.length;
      result = size == b.length;
      if (result) {
        // Deep compare the contents, ignoring non-numeric properties.
        while (size--) {
          if (!(result = eq(a[size], b[size], aStack, bStack))) break;
        }
      }
    } else {
      // Objects with different constructors are not equivalent, but `Object`s
      // from different frames are.
      var aCtor = a.constructor, bCtor = b.constructor;
      if (aCtor !== bCtor && !(_.isFunction(aCtor) && (aCtor instanceof aCtor) &&
                               _.isFunction(bCtor) && (bCtor instanceof bCtor))) {
        return false;
      }
      // Deep compare objects.
      for (var key in a) {
        if (_.has(a, key)) {
          // Count the expected number of properties.
          size++;
          // Deep compare each member.
          if (!(result = _.has(b, key) && eq(a[key], b[key], aStack, bStack))) break;
        }
      }
      // Ensure that both objects contain the same number of properties.
      if (result) {
        for (key in b) {
          if (_.has(b, key) && !(size--)) break;
        }
        result = !size;
      }
    }
    // Remove the first object from the stack of traversed objects.
    aStack.pop();
    bStack.pop();
    return result;
  };

  // Perform a deep comparison to check if two objects are equal.
  _.isEqual = function(a, b) {
    return eq(a, b, [], []);
  };

  // Is a given array, string, or object empty?
  // An "empty" object has no enumerable own-properties.
  _.isEmpty = function(obj) {
    if (obj == null) return true;
    if (_.isArray(obj) || _.isString(obj)) return obj.length === 0;
    for (var key in obj) if (_.has(obj, key)) return false;
    return true;
  };

  // Is a given value a DOM element?
  _.isElement = function(obj) {
    return !!(obj && obj.nodeType === 1);
  };

  // Is a given value an array?
  // Delegates to ECMA5's native Array.isArray
  _.isArray = nativeIsArray || function(obj) {
    return toString.call(obj) == '[object Array]';
  };

  // Is a given variable an object?
  _.isObject = function(obj) {
    return obj === Object(obj);
  };

  // Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp.
  each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp'], function(name) {
    _['is' + name] = function(obj) {
      return toString.call(obj) == '[object ' + name + ']';
    };
  });

  // Define a fallback version of the method in browsers (ahem, IE), where
  // there isn't any inspectable "Arguments" type.
  if (!_.isArguments(arguments)) {
    _.isArguments = function(obj) {
      return !!(obj && _.has(obj, 'callee'));
    };
  }

  // Optimize `isFunction` if appropriate.
  if (typeof (/./) !== 'function') {
    _.isFunction = function(obj) {
      return typeof obj === 'function';
    };
  }

  // Is a given object a finite number?
  _.isFinite = function(obj) {
    return isFinite(obj) && !isNaN(parseFloat(obj));
  };

  // Is the given value `NaN`? (NaN is the only number which does not equal itself).
  _.isNaN = function(obj) {
    return _.isNumber(obj) && obj != +obj;
  };

  // Is a given value a boolean?
  _.isBoolean = function(obj) {
    return obj === true || obj === false || toString.call(obj) == '[object Boolean]';
  };

  // Is a given value equal to null?
  _.isNull = function(obj) {
    return obj === null;
  };

  // Is a given variable undefined?
  _.isUndefined = function(obj) {
    return obj === void 0;
  };

  // Shortcut function for checking if an object has a given property directly
  // on itself (in other words, not on a prototype).
  _.has = function(obj, key) {
    return hasOwnProperty.call(obj, key);
  };

  // Utility Functions
  // -----------------

  // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
  // previous owner. Returns a reference to the Underscore object.
  _.noConflict = function() {
    root._ = previousUnderscore;
    return this;
  };

  // Keep the identity function around for default iterators.
  _.identity = function(value) {
    return value;
  };

  // Run a function **n** times.
  _.times = function(n, iterator, context) {
    var accum = Array(n);
    for (var i = 0; i < n; i++) accum[i] = iterator.call(context, i);
    return accum;
  };

  // Return a random integer between min and max (inclusive).
  _.random = function(min, max) {
    if (max == null) {
      max = min;
      min = 0;
    }
    return min + Math.floor(Math.random() * (max - min + 1));
  };

  // List of HTML entities for escaping.
  var entityMap = {
    escape: {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;'
    }
  };
  entityMap.unescape = _.invert(entityMap.escape);

  // Regexes containing the keys and values listed immediately above.
  var entityRegexes = {
    escape:   new RegExp('[' + _.keys(entityMap.escape).join('') + ']', 'g'),
    unescape: new RegExp('(' + _.keys(entityMap.unescape).join('|') + ')', 'g')
  };

  // Functions for escaping and unescaping strings to/from HTML interpolation.
  _.each(['escape', 'unescape'], function(method) {
    _[method] = function(string) {
      if (string == null) return '';
      return ('' + string).replace(entityRegexes[method], function(match) {
        return entityMap[method][match];
      });
    };
  });

  // If the value of the named property is a function then invoke it;
  // otherwise, return it.
  _.result = function(object, property) {
    if (object == null) return null;
    var value = object[property];
    return _.isFunction(value) ? value.call(object) : value;
  };

  // Add your own custom functions to the Underscore object.
  _.mixin = function(obj) {
    each(_.functions(obj), function(name){
      var func = _[name] = obj[name];
      _.prototype[name] = function() {
        var args = [this._wrapped];
        push.apply(args, arguments);
        return result.call(this, func.apply(_, args));
      };
    });
  };

  // Generate a unique integer id (unique within the entire client session).
  // Useful for temporary DOM ids.
  var idCounter = 0;
  _.uniqueId = function(prefix) {
    var id = ++idCounter + '';
    return prefix ? prefix + id : id;
  };

  // By default, Underscore uses ERB-style template delimiters, change the
  // following template settings to use alternative delimiters.
  _.templateSettings = {
    evaluate    : /<%([\s\S]+?)%>/g,
    interpolate : /<%=([\s\S]+?)%>/g,
    escape      : /<%-([\s\S]+?)%>/g
  };

  // When customizing `templateSettings`, if you don't want to define an
  // interpolation, evaluation or escaping regex, we need one that is
  // guaranteed not to match.
  var noMatch = /(.)^/;

  // Certain characters need to be escaped so that they can be put into a
  // string literal.
  var escapes = {
    "'":      "'",
    '\\':     '\\',
    '\r':     'r',
    '\n':     'n',
    '\t':     't',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  var escaper = /\\|'|\r|\n|\t|\u2028|\u2029/g;

  // JavaScript micro-templating, similar to John Resig's implementation.
  // Underscore templating handles arbitrary delimiters, preserves whitespace,
  // and correctly escapes quotes within interpolated code.
  _.template = function(text, data, settings) {
    var render;
    settings = _.defaults({}, settings, _.templateSettings);

    // Combine delimiters into one regular expression via alternation.
    var matcher = new RegExp([
      (settings.escape || noMatch).source,
      (settings.interpolate || noMatch).source,
      (settings.evaluate || noMatch).source
    ].join('|') + '|$', 'g');

    // Compile the template source, escaping string literals appropriately.
    var index = 0;
    var source = "__p+='";
    text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
      source += text.slice(index, offset)
        .replace(escaper, function(match) { return '\\' + escapes[match]; });

      if (escape) {
        source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
      }
      if (interpolate) {
        source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
      }
      if (evaluate) {
        source += "';\n" + evaluate + "\n__p+='";
      }
      index = offset + match.length;
      return match;
    });
    source += "';\n";

    // If a variable is not specified, place data values in local scope.
    if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

    source = "var __t,__p='',__j=Array.prototype.join," +
      "print=function(){__p+=__j.call(arguments,'');};\n" +
      source + "return __p;\n";

    try {
      render = new Function(settings.variable || 'obj', '_', source);
    } catch (e) {
      e.source = source;
      throw e;
    }

    if (data) return render(data, _);
    var template = function(data) {
      return render.call(this, data, _);
    };

    // Provide the compiled function source as a convenience for precompilation.
    template.source = 'function(' + (settings.variable || 'obj') + '){\n' + source + '}';

    return template;
  };

  // Add a "chain" function, which will delegate to the wrapper.
  _.chain = function(obj) {
    return _(obj).chain();
  };

  // OOP
  // ---------------
  // If Underscore is called as a function, it returns a wrapped object that
  // can be used OO-style. This wrapper holds altered versions of all the
  // underscore functions. Wrapped objects may be chained.

  // Helper function to continue chaining intermediate results.
  var result = function(obj) {
    return this._chain ? _(obj).chain() : obj;
  };

  // Add all of the Underscore functions to the wrapper object.
  _.mixin(_);

  // Add all mutator Array functions to the wrapper.
  each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      var obj = this._wrapped;
      method.apply(obj, arguments);
      if ((name == 'shift' || name == 'splice') && obj.length === 0) delete obj[0];
      return result.call(this, obj);
    };
  });

  // Add all accessor Array functions to the wrapper.
  each(['concat', 'join', 'slice'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      return result.call(this, method.apply(this._wrapped, arguments));
    };
  });

  _.extend(_.prototype, {

    // Start chaining a wrapped Underscore object.
    chain: function() {
      this._chain = true;
      return this;
    },

    // Extracts the result from a wrapped and chained object.
    value: function() {
      return this._wrapped;
    }

  });

}).call(this);

},{}],43:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],44:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],45:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./support/isBuffer":44,"_process":37,"inherits":43}],46:[function(require,module,exports){
var v1 = require('./v1');
var v4 = require('./v4');

var uuid = v4;
uuid.v1 = v1;
uuid.v4 = v4;

module.exports = uuid;

},{"./v1":49,"./v4":50}],47:[function(require,module,exports){
/**
 * Convert array of 16 byte values to UUID string format of the form:
 * XXXXXXXX-XXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
 */
var byteToHex = [];
for (var i = 0; i < 256; ++i) {
  byteToHex[i] = (i + 0x100).toString(16).substr(1);
}

function bytesToUuid(buf, offset) {
  var i = offset || 0;
  var bth = byteToHex;
  return  bth[buf[i++]] + bth[buf[i++]] +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] +
          bth[buf[i++]] + bth[buf[i++]] +
          bth[buf[i++]] + bth[buf[i++]];
}

module.exports = bytesToUuid;

},{}],48:[function(require,module,exports){
(function (global){
// Unique ID creation requires a high quality random # generator.  In the
// browser this is a little complicated due to unknown quality of Math.random()
// and inconsistent support for the `crypto` API.  We do the best we can via
// feature-detection
var rng;

var crypto = global.crypto || global.msCrypto; // for IE 11
if (crypto && crypto.getRandomValues) {
  // WHATWG crypto RNG - http://wiki.whatwg.org/wiki/Crypto
  var rnds8 = new Uint8Array(16);
  rng = function whatwgRNG() {
    crypto.getRandomValues(rnds8);
    return rnds8;
  };
}

if (!rng) {
  // Math.random()-based (RNG)
  //
  // If all else fails, use Math.random().  It's fast, but is of unspecified
  // quality.
  var  rnds = new Array(16);
  rng = function() {
    for (var i = 0, r; i < 16; i++) {
      if ((i & 0x03) === 0) r = Math.random() * 0x100000000;
      rnds[i] = r >>> ((i & 0x03) << 3) & 0xff;
    }

    return rnds;
  };
}

module.exports = rng;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],49:[function(require,module,exports){
// Unique ID creation requires a high quality random # generator.  We feature
// detect to determine the best RNG source, normalizing to a function that
// returns 128-bits of randomness, since that's what's usually required
var rng = require('./lib/rng');
var bytesToUuid = require('./lib/bytesToUuid');

// **`v1()` - Generate time-based UUID**
//
// Inspired by https://github.com/LiosK/UUID.js
// and http://docs.python.org/library/uuid.html

// random #'s we need to init node and clockseq
var _seedBytes = rng();

// Per 4.5, create and 48-bit node id, (47 random bits + multicast bit = 1)
var _nodeId = [
  _seedBytes[0] | 0x01,
  _seedBytes[1], _seedBytes[2], _seedBytes[3], _seedBytes[4], _seedBytes[5]
];

// Per 4.2.2, randomize (14 bit) clockseq
var _clockseq = (_seedBytes[6] << 8 | _seedBytes[7]) & 0x3fff;

// Previous uuid creation time
var _lastMSecs = 0, _lastNSecs = 0;

// See https://github.com/broofa/node-uuid for API details
function v1(options, buf, offset) {
  var i = buf && offset || 0;
  var b = buf || [];

  options = options || {};

  var clockseq = options.clockseq !== undefined ? options.clockseq : _clockseq;

  // UUID timestamps are 100 nano-second units since the Gregorian epoch,
  // (1582-10-15 00:00).  JSNumbers aren't precise enough for this, so
  // time is handled internally as 'msecs' (integer milliseconds) and 'nsecs'
  // (100-nanoseconds offset from msecs) since unix epoch, 1970-01-01 00:00.
  var msecs = options.msecs !== undefined ? options.msecs : new Date().getTime();

  // Per 4.2.1.2, use count of uuid's generated during the current clock
  // cycle to simulate higher resolution clock
  var nsecs = options.nsecs !== undefined ? options.nsecs : _lastNSecs + 1;

  // Time since last uuid creation (in msecs)
  var dt = (msecs - _lastMSecs) + (nsecs - _lastNSecs)/10000;

  // Per 4.2.1.2, Bump clockseq on clock regression
  if (dt < 0 && options.clockseq === undefined) {
    clockseq = clockseq + 1 & 0x3fff;
  }

  // Reset nsecs if clock regresses (new clockseq) or we've moved onto a new
  // time interval
  if ((dt < 0 || msecs > _lastMSecs) && options.nsecs === undefined) {
    nsecs = 0;
  }

  // Per 4.2.1.2 Throw error if too many uuids are requested
  if (nsecs >= 10000) {
    throw new Error('uuid.v1(): Can\'t create more than 10M uuids/sec');
  }

  _lastMSecs = msecs;
  _lastNSecs = nsecs;
  _clockseq = clockseq;

  // Per 4.1.4 - Convert from unix epoch to Gregorian epoch
  msecs += 12219292800000;

  // `time_low`
  var tl = ((msecs & 0xfffffff) * 10000 + nsecs) % 0x100000000;
  b[i++] = tl >>> 24 & 0xff;
  b[i++] = tl >>> 16 & 0xff;
  b[i++] = tl >>> 8 & 0xff;
  b[i++] = tl & 0xff;

  // `time_mid`
  var tmh = (msecs / 0x100000000 * 10000) & 0xfffffff;
  b[i++] = tmh >>> 8 & 0xff;
  b[i++] = tmh & 0xff;

  // `time_high_and_version`
  b[i++] = tmh >>> 24 & 0xf | 0x10; // include version
  b[i++] = tmh >>> 16 & 0xff;

  // `clock_seq_hi_and_reserved` (Per 4.2.2 - include variant)
  b[i++] = clockseq >>> 8 | 0x80;

  // `clock_seq_low`
  b[i++] = clockseq & 0xff;

  // `node`
  var node = options.node || _nodeId;
  for (var n = 0; n < 6; ++n) {
    b[i + n] = node[n];
  }

  return buf ? buf : bytesToUuid(b);
}

module.exports = v1;

},{"./lib/bytesToUuid":47,"./lib/rng":48}],50:[function(require,module,exports){
var rng = require('./lib/rng');
var bytesToUuid = require('./lib/bytesToUuid');

function v4(options, buf, offset) {
  var i = buf && offset || 0;

  if (typeof(options) == 'string') {
    buf = options == 'binary' ? new Array(16) : null;
    options = null;
  }
  options = options || {};

  var rnds = options.random || (options.rng || rng)();

  // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`
  rnds[6] = (rnds[6] & 0x0f) | 0x40;
  rnds[8] = (rnds[8] & 0x3f) | 0x80;

  // Copy bytes to buffer, if provided
  if (buf) {
    for (var ii = 0; ii < 16; ++ii) {
      buf[i + ii] = rnds[ii];
    }
  }

  return buf || bytesToUuid(rnds);
}

module.exports = v4;

},{"./lib/bytesToUuid":47,"./lib/rng":48}]},{},[14]);
