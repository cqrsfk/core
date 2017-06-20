import { Actor, ActorConstructor } from "./Actor";
import EventStore from "./DefaultEventStore";
export default class Repository {
    private ActorClass;
    private eventstore;
    private cache;
    constructor(ActorClass: ActorConstructor, eventstore: EventStore);
    create(data: any): Promise<Actor>;
    clear(id: any): void;
    getFromCache(id: any): Actor;
    get(id: any): Promise<Actor>;
    exist(id: any): boolean;
}
