import { ActorConstructor } from "./Actor";
import EventStore from "./DefaultEventStore";
import EventBus from "./EventBus";
export default class Domain {
    eventstore: EventStore;
    eventbus: EventBus;
    private ActorClassMap;
    private repositorieMap;
    constructor(options?: any);
    private getNativeActor(type, id);
    private nativeCreateActor(type, data);
    private getActorProxy(type, id, sagaId?, key?);
    register(Classes: ActorConstructor[] | ActorConstructor): this;
    create(type: string, data: any): Promise<any>;
    get(type: string, id: string): Promise<any>;
    on(event: any, handle: any): void;
    once(event: any, handle: any): void;
}
