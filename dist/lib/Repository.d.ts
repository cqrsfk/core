import { Actor, ActorConstructor } from "./Actor";
import EventStore from "./DefaultEventStore";
import Snap from "./Snap";
export default class Repository {
    private ActorClass;
    private eventstore;
    private cache;
    constructor(ActorClass: ActorConstructor, eventstore: EventStore);
    create(data: any): Promise<Actor>;
    clear(id: any): void;
    getFromCache(id: any): Actor;
    getHistory(actorId: string): Promise<{
        _events: any;
        _snap: Snap;
        _index: any;
        _validateIndex(index: any): boolean;
        done: boolean;
        data: any;
        _get(index: any): any;
        next(): any;
        prev(): any;
    }>;
    get(id: any): Promise<Actor>;
    exist(id: any): boolean;
}
