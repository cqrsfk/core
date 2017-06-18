import { Actor, ActorConstructor } from "./Actor";
import Service from "./Service";
import Repository from "./Repository";
import EventStore from "./DefaultEventStore";
import EventBus from "./EventBus";
const di = require("class-di")

export default class Domain {

    public eventstore: EventStore;
    public eventbus: EventBus;
    private ActorClassMap: Map<string, ActorConstructor>;
    private repositorieMap: Map<ActorConstructor, Repository>;

    constructor(options: any = {}) {
        this.eventstore = options.EventStore ? new options.EventStore : new EventStore();
        this.eventbus = options.EventBus ? new options.EventBus(this.eventstore) : new EventBus(this.eventstore);
        this.ActorClassMap = new Map();
        this.repositorieMap = new Map();
    }

    private async getNativeActor(type: string, id: string): Promise<any> {
        let repo = this.repositorieMap.get(this.ActorClassMap.get(type));
        return await repo.get(id);
    }

    private async nativeCreateActor(type, data) {
        const ActorClass = this.ActorClassMap.get(type);
        const repo = this.repositorieMap.get(ActorClass);

        if (ActorClass.createBefor) {
            try {
                let result = await ActorClass.createBefor(data);
            } catch (err) {
                throw err;
            }
        }
        const actorId = (await repo.create(data)).json.id;
        return await this.getActorProxy(type, actorId);
    }

    private async getActorProxy(type: string, id: string, sagaId?: string) {
        const that = this;
        const actor = await this.getNativeActor(type, id);
        const proxy = new Proxy(actor, {
            get(target, prop: string) {
                if (prop === "then") { return proxy };
                const method = actor[prop];
                if (method && typeof method === "function")
                    return new Proxy(actor[prop], {
                        apply(target, cxt, args) {
                            cxt = { service: new Service(actor, that.eventbus, (type, id) => that.getNativeActor(type, id), (type, id) => that.getActorProxy(type, id), prop, sagaId) };
                            cxt.__proto__ = proxy;
                            return target.call(cxt, ...args);
                        }
                    });
            }
        })
        return proxy;
    }

    register(Classes: ActorConstructor[] | ActorConstructor) {

        if (!Array.isArray(Classes)) {
            Classes = [Classes]
        }

        for (let Class of Classes) {
            this.ActorClassMap.set(Class.getType(), Class);
            this.repositorieMap.set(Class, new Repository(Class, this.eventstore));
        }

        return this;

    }

    async create(type: string, data: any) {
        return await this.nativeCreateActor(type, data);
    }

    async get(type: string, id: string) {
        return await this.getActorProxy(type, id);
    }

}