"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Service_1 = require("./Service");
const Repository_1 = require("./Repository");
const DefaultEventStore_1 = require("./DefaultEventStore");
const EventBus_1 = require("./EventBus");
const di = require("class-di");
const isLock = Symbol.for("isLock");
class Domain {
    constructor(options = {}) {
        this.eventstore = options.EventStore ? new options.EventStore : new DefaultEventStore_1.default();
        this.eventbus = options.EventBus ? new options.EventBus(this.eventstore) : new EventBus_1.default(this.eventstore);
        this.ActorClassMap = new Map();
        this.repositorieMap = new Map();
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
                let result = await ActorClass.createBefor(data);
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
                                        cxt = { service: new Service_1.default(actor, that.eventbus, (type, id, key) => that.getActorProxy(type, id, key), (type, data) => that.nativeCreateActor(type, id), prop, sagaId) };
                                        cxt.__proto__ = proxy;
                                        const result = target.call(cxt, ...args);
                                        if (result instanceof Promise) {
                                            result.then(result => resolve(result));
                                        }
                                        else {
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
                    return (actor.json)[prop] || actor[prop];
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
//# sourceMappingURL=Domain.js.map