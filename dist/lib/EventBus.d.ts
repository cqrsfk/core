/// <reference types="node" />
import { EventEmitter } from "events";
import EventType from "./EventType";
import ActorConstructor from "./ActorConstructor";
import Actor from "./Actor";
import Repository from "./Repository";
import EventStore from "./EventStore";
import Domain from "./Domain";
export default class EventBus {
    private eventstore;
    private domain;
    private repositorieMap;
    private ActorClassMap;
    emitter: EventEmitter;
    private lockSet;
    private subscribeRepo;
    constructor(eventstore: EventStore, domain: Domain, repositorieMap: Map<ActorConstructor, Repository>, ActorClassMap: Map<string, ActorConstructor>);
    once(event: EventType, cb?: Function): Promise<Event>;
    on(event: EventType, cb: Function): void;
    publish(actor: Actor): Promise<void>;
    rollback(sagaId: any): Promise<void>;
}
