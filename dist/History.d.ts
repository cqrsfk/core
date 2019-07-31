import { Actor } from "./Actor";
import { Event } from "./types/Event";
export declare class History {
    private protoActor;
    private events;
    private index;
    private currentActor;
    constructor(protoActor: Actor, events: Event[]);
    get(): Actor;
    getIndex(): number;
    next(): Actor | undefined;
    prev(): Actor | undefined;
    latest(): Actor;
}
