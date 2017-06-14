import { EventEmitter } from "events";
import EventType from "./EventType";
import { Actor } from "./Actor";
import EventStore from "./EventStore";
export default class EventBus {
    constructor(private eventstore: EventStore) { }
    once(event: EventType, callback: Function) {

    }
    on(event: EventType) {

    }
    publish(actor: Actor) {

    }
    async rollback(sagaId) {
        
    }
}