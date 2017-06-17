import EventType from "./EventType";
import { Actor } from "./Actor";
import EventStore from "./EventStore";
export default class EventBus {
    private eventstore;
    private emitter;
    private lockSet;
    constructor(eventstore: EventStore);
    once(event: EventType, cb?: Function): Promise<Event>;
    on(event: EventType, cb: Function): void;
    publish(actor: Actor): Promise<void>;
    rollback(sagaId: any): Promise<void>;
}
