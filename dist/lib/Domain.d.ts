import ActorConstructor from "./ActorConstructor";
import Repository from "./Repository";
import EventStore from "./DefaultEventStore";
import EventBus from "./EventBus";
export declare const getActorProxy: symbol;
export default class Domain {
    eventstore: EventStore;
    eventbus: EventBus;
    ActorClassMap: Map<string, ActorConstructor>;
    repositorieMap: Map<ActorConstructor, Repository>;
    private roleMap;
    private setEventStore;
    private beforeCallHandles;
    readonly id: any;
    constructor(options?: any);
    use(plugin: any): Domain;
    private getNativeActor(type, id);
    private nativeCreateActor(type, data);
    register(Classes: ActorConstructor[] | ActorConstructor): this;
    create(type: string, data: any): Promise<any>;
    get(type: string, id: string): Promise<any>;
    on(event: any, handle: any): void;
    once(event: any, handle: any): void;
    getCacheActorIds(): any[];
    addRole(name: string | any, supportedActorNames?: string[], methods?: any, updater?: any): this;
}
