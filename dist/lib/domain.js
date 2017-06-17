"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Service_1 = require("./Service");
const Repository_1 = require("./Repository");
const DefaultEventStore_1 = require("./DefaultEventStore");
const EventBus_1 = require("./EventBus");
const di = require("class-di");
class Domain {
    constructor() {
        this.eventstore = new DefaultEventStore_1.default();
        this.bus = new EventBus_1.default(this.eventstore);
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
        return (await repo.create(data)).json;
    }
    async getActorProxy(type, id, sagaId) {
        const actor = await this.getNativeActor(type, id);
        const proxy = new Proxy(actor, {
            get(target, prop) {
                return new Proxy(actor[prop], {
                    apply(target, cxt, args) {
                        cxt = { service: new Service_1.default(target, this.bus, this.getNativeActor.bind(this), this.getActorProxy.bind(this), prop, sagaId) };
                        cxt.__proto__ = proxy;
                        return target.call(cxt, ...args);
                    }
                });
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
        return this.nativeCreateActor(type, data);
    }
    async get(type, id) {
        return this.getActorProxy(type, id);
    }
}
exports.default = Domain;
//# sourceMappingURL=Domain.js.map