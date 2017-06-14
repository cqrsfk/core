"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Actor_1 = require("./Actor");
exports.Actor = Actor_1.Actor;
const Service_1 = require("./Service");
const Repository_1 = require("./Repository");
const DefaultEventStore_1 = require("./DefaultEventStore");
const EventBus_1 = require("./EventBus");
const di = require("class-di");
const eventstore = new DefaultEventStore_1.default();
const bus = new EventBus_1.default(eventstore);
const ActorClassMap = new Map();
const repositorieMap = new Map();
async function getActorProxy(type, id, sagaId) {
    const actor = await getNativeActor(type, id);
    const proxy = new Proxy(actor, {
        get(target, prop) {
            return new Proxy(actor[prop], {
                apply(target, cxt, args) {
                    cxt = { service: new Service_1.default(target, bus, getNativeActor, getActorProxy, prop, sagaId) };
                    cxt.__proto__ = proxy;
                    return target.call(cxt, ...args);
                }
            });
        }
    });
    return proxy;
}
async function nativeCreateActor(type, data) {
    const ActorClass = ActorClassMap.get(type);
    const repo = repositorieMap.get(ActorClass);
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
async function getNativeActor(type, id) {
    let repo = repositorieMap.get(ActorClassMap.get(type));
    return await repo.get(id);
}
var domain = {
    register(Classes) {
        if (!Array.isArray(Classes)) {
            Classes = [Classes];
        }
        for (let Class of Classes) {
            // const ActorClass: ActorConstructor = di(Class, function (method, cxt, args, methodname, Class, newArgs) {
            //     return { service: new Service(cxt, bus, domain, getActor, methodname) };
            // });
            ActorClassMap.set(Class.getType(), Class);
            repositorieMap.set(Class, new Repository_1.default(Class, eventstore, ActorClassMap, this));
        }
        return this;
    },
    async create(type, data) {
        return nativeCreateActor(type, data);
    },
    async get(type, id) {
        return getActorProxy(type, id);
    }
};
exports.default = domain;
//# sourceMappingURL=domain.js.map