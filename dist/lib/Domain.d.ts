import { ActorConstructor } from "./Actor";
import Repository from "./Repository";
import EventStore from "./DefaultEventStore";
import EventBus from "./EventBus";
export default class Domain {
    eventstore: EventStore;
    eventbus: EventBus;
    ActorClassMap: Map<string, ActorConstructor>;
    repositorieMap: Map<ActorConstructor, Repository>;
    private clusterInfoManager;
    private domainServer;
    private domainProxy;
    readonly id: any;
    constructor(options?: any);
    private getNativeActor(type, id);
    private nativeCreateActor(type, data);
    register(Classes: ActorConstructor[] | ActorConstructor): this;
    create(type: string, data: any): Promise<any>;
    get(type: string, id: string): Promise<any>;
    on(event: any, handle: any): void;
    once(event: any, handle: any): void;
    getCacheActorIds(): any[];
}
