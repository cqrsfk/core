import EventType from "./EventType";
import { Actor } from "./Actor";
import EventStore from "./EventStore";
export default class EventBus {
    private eventstore;
    constructor(eventstore: EventStore);
    once(event: EventType, callback: Function): void;
    on(event: EventType): void;
    publish(actor: Actor): void;
    rollback(sagaId: any): Promise<void>;
}
