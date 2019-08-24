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
    next<T extends Actor>(): T;
    getUndoneEvents(sagaId: any): Event[];
    prev<T extends Actor>(): T;
    latest<T extends Actor>(): T;
}
