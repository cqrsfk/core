"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Service_1 = require("./Service");
const Repository_1 = require("./Repository");
const DefaultEventStore_1 = require("./DefaultEventStore");
const EventBus_1 = require("./EventBus");
const isLock = Symbol.for("isLock");
const debug = require('debug')('domain');
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
        debug("BEGIN getNativeActor(type=%s , id=%s)", type, id);
        let repo = this.repositorieMap.get(this.ActorClassMap.get(type));
        const actor = await repo.get(id);
        debug("END getNativeActor");
        return actor;
    }
    async nativeCreateActor(type, data) {
        debug("BEGIN nativeCreateActor(type=%s , data=%s)", type, data);
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
        const actor = await this.getActorProxy(type, actorId);
        debug("END nativeCreateActor");
        return actor;
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
                        console.log(type, "apply 5");
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
    getCacheActorIds() {
        let result = [];
        for (let [key, Actor] of this.ActorClassMap) {
            result = result.concat(this.repositorieMap.get(Actor).getCacheActorIds());
        }
        return result;
    }
}
exports.default = Domain;
//# sourceMappingURL=Domain.js.map