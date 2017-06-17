import { Actor, ActorConstructor } from "./Actor";
import Service from "./Service";
import Repository from "./Repository";
import EventStore from "./DefaultEventStore";
import EventBus from "./EventBus";
const di = require("class-di")

export default class Domain {

    private eventstore;
    private bus;
    private ActorClassMap: Map<string, ActorConstructor>;
    private repositorieMap: Map<ActorConstructor, Repository>;

    constructor() {
        this.eventstore = new EventStore();
        this.bus = new EventBus(this.eventstore);
        this.ActorClassMap = new Map();
        this.repositorieMap = new Map();
    }

    private async getNativeActor(type: string, id: string): Promise<any> {
        let repo = this.repositorieMap.get(this.ActorClassMap.get(type));
        return await repo.get(id);
    }

    private async  nativeCreateActor(type, data) {
        const ActorClass = this.ActorClassMap.get(type);
        const repo = this.repositorieMap.get(ActorClass);

        if (ActorClass.createBefor) {
            try {
                let result = await ActorClass.createBefor(data);
            } catch (err) {
                throw err;
            }
        }
        return (await repo.create(data)).json;
    }

    private async  getActorProxy(type: string, id: string, sagaId?: string) {
        const actor = await this.getNativeActor(type, id);
        const proxy = new Proxy(actor, {
            get(target, prop: string) {
                return new Proxy(actor[prop], {
                    apply(target, cxt, args) {
                        cxt = { service: new Service(target, this.bus, this.getNativeActor.bind(this), this.getActorProxy.bind(this), prop, sagaId) };
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

    async create(type: string, data: any): Promise<any> {
        return this.nativeCreateActor(type, data);
    }

    async get(type: string, id: string) {
        return this.getActorProxy(type, id);
    }

}