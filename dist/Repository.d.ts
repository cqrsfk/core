/// <reference types="node" />
import ActorConstructor from "./ActorConstructor";
import Actor from "./Actor";
import EventStore from "./DefaultEventStore";
import { EventEmitter } from "events";
import Role from "./Role";
import History from "./History";
export default class Repository extends EventEmitter {
    private ActorClass;
    private eventstore;
    private roleMap;
    private cache;
    constructor(ActorClass: ActorConstructor, eventstore: EventStore, roleMap: Map<string, Role>);
    create(data: any): Promise<Actor>;
    clear(id: any): void;
    getFromCache(id: any): Actor;
    getHistory(actorId: string, actorType?: string): Promise<History>;
    get(id: any): Promise<Actor>;
    exist(id: any): boolean;
    getCacheActorIds(): string[];
}
