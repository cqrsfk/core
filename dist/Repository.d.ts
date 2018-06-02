/// <reference types="node" />
import ActorConstructor from "./ActorConstructor";
import Actor from "./Actor";
import EventStore from "./DefaultEventStore";
import Snap from "./Snap";
import { EventEmitter } from "events";
import Role from "./Role";
export default class Repository extends EventEmitter {
    private ActorClass;
    private eventstore;
    private roleMap;
    private cache;
    constructor(ActorClass: ActorConstructor, eventstore: EventStore, roleMap: Map<string, Role>);
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
