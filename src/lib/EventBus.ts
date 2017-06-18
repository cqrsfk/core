import { EventEmitter } from "events";
import EventType from "./EventType";
import { Actor } from "./Actor";
import EventStore from "./EventStore";
import { getAlias } from "./eventAlias";
import Snap from "./Snap";
const uncommittedEvents = Symbol.for("uncommittedEvents");

export default class EventBus {
    private emitter = new EventEmitter();
    private lockSet = new Set();
    constructor(private eventstore: EventStore) {
        this.eventstore.on("saved events", events => {
            for (let event of events) {
                const alias = getAlias(event);
                for (let name of alias) {
                    process.nextTick(() => {
                        this.emitter.emit(name, event);
                    });
                }
            }
        });
    }

    once(event: EventType, cb?: Function): Promise<Event> {
        return new Promise((resolve, reject) => {
            this.emitter.once(getAlias(event), function (event) {
                resolve(event);
                if (cb) {
                    setImmediate(() => cb(event));
                }
            });
        })
    }

    on(event: EventType, cb: Function) {
        this.emitter.on(getAlias(event), function (event) {
            cb(event);
        });
    }
    async publish(actor: Actor) {

        if (this.lockSet.has(actor.id)) {
            return;
        } else {
            this.lockSet.add(actor.id);
        }

        const event = await this.eventstore.getLatestEvent(actor.id);
        let startIndex = event ? event.index + 1 : 0;
        let events = actor[uncommittedEvents].map(function (evt, index) {
            evt.index = index + startIndex;
            return evt;
        });
        await this.eventstore.saveEvents(events);
        actor[uncommittedEvents] = [];

        let snap = await this.eventstore.getLatestSnapshot(actor.id);
        let lastEvent = events[events.length - 1];
        if (lastEvent.index - snap.lastEventId > 10) {
            let latestEventIndex = lastEvent.index;
            let index = snap.index + 1;
            let newSnap = new Snap(actor, index, latestEventIndex);
            await this.eventstore.createSnap(newSnap);
        }
        this.lockSet.delete(actor.id);
        if (actor[uncommittedEvents].length) {
            await this.publish(actor);
        }
    }

    // todo
    async rollback(sagaId) {

    }
}