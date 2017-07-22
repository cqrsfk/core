/// <reference types="node" />
import { Actor, ActorConstructor } from "./Actor";
import EventStore from "./DefaultEventStore";
import Snap from "./Snap";
import { EventEmitter } from "events";
export default class Repository extends EventEmitter {
    private ActorClass;
    private eventstore;
    private oldActorClassMap;
    private cache;
    constructor(ActorClass: ActorConstructor, eventstore: EventStore, oldActorClassMap: Map<string, Map<string, ActorConstructor>>);
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
    getCacheActorIds(): string[];
}
