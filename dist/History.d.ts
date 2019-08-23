import { Actor } from "./Actor";
import { Event } from "./types/Event";
export declare class History {
    private protoActor;
    readonly events: Event[];
    private index;
    private currentActor;
    constructor(protoActor: Actor, events: Event[]);
    get<T extends Actor>(): T;
    getIndex(): number;
    next(): Actor | undefined;
    getUndoneEvents(sagaId: any): Event[];
    prev(): Actor | undefined;
    latest(): Actor;
}
