import { Actor, ActorConstructor } from "./Actor";
import EventStore from "./DefaultEventStore";
export default class Repository {
    constructor(ActorClass: ActorConstructor, eventstore: EventStore, ActorClasses: Map<string, ActorConstructor>, domain: any);
    create(data: any): Promise<Actor>;
    createSnap(actor: any): Promise<void>;
    clear(id: any): void;
    getFromCache(id: any): void;
    get(id: any): Promise<Actor>;
    exist(id: any): void;
}
