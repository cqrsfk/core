import { Actor, ActorConstructor } from "./Actor";
import Service from "./Service";
import Repository from "./Repository";
import EventStore from "./DefaultEventStore";
import EventBus from "./EventBus";
const di = require("class-di")
const eventstore = new EventStore();
const bus = new EventBus(eventstore);
const ActorClassMap: Map<string, ActorConstructor> = new Map();
const repositorieMap: Map<ActorConstructor, Repository> = new Map();

async function getActorProxy(type: string, id: string, sagaId?: string) {
    const actor = await getNativeActor(type, id);
    const proxy = new Proxy(actor, {
        get(target, prop: string) {
            return new Proxy(actor[prop], {
                apply(target, cxt, args) {
                    cxt = { service: new Service(target, bus, getNativeActor, getActorProxy, prop, sagaId) };
                    cxt.__proto__ = proxy;
                    return target.call(cxt, ...args);
                }
            });
        }
    })
    return proxy;
}

async function nativeCreateActor(type, data) {
    const ActorClass = ActorClassMap.get(type);
    const repo = repositorieMap.get(ActorClass);

    if (ActorClass.createBefor) {
        try {
            let result = await ActorClass.createBefor(data);
        } catch (err) {
            throw err;
        }
    }
    return (await repo.create(data)).json;
}

async function getNativeActor(type: string, id: string): Promise<any> {
    let repo = repositorieMap.get(ActorClassMap.get(type));
    return await repo.get(id);
}

var domain = {

    register(Classes: ActorConstructor[] | ActorConstructor) {

        if (!Array.isArray(Classes)) {
            Classes = [Classes]
        }

        for (let Class of Classes) {

            // const ActorClass: ActorConstructor = di(Class, function (method, cxt, args, methodname, Class, newArgs) {
            //     return { service: new Service(cxt, bus, domain, getActor, methodname) };
            // });

            ActorClassMap.set(Class.getType(), Class);
            repositorieMap.set(Class, new Repository(Class, eventstore, ActorClassMap, this));
        }

        return this;

    },

    async create(type: string, data: any): Promise<any> {
        return nativeCreateActor(type, data);
    },

    async get(type: string, id: string) {
        return getActorProxy(type, id);
    }

}

export default domain;
export { Actor }