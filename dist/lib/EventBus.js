"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const eventAlias_1 = require("./eventAlias");
const Snap_1 = require("./Snap");
const uncommittedEvents = Symbol.for("uncommittedEvents");
class EventBus {
    constructor(eventstore) {
        this.eventstore = eventstore;
        this.emitter = new events_1.EventEmitter();
        this.lockSet = new Set();
        this.eventstore.on("savaed events", events => {
            for (let event of events) {
                const alias = eventAlias_1.getAlias(event);
                for (let name of alias) {
                    process.nextTick(() => {
                        this.emitter.emit(name, event);
                    });
                }
            }
        });
    }
    once(event, cb) {
        return new Promise((resolve, reject) => {
            this.emitter.once(eventAlias_1.getAlias(event), function (event) {
                resolve(event);
                if (cb) {
                    setImmediate(() => cb(event));
                }
            });
        });
    }
    on(event, cb) {
        this.emitter.on(eventAlias_1.getAlias(event), function (event) {
            cb(event);
        });
    }
    async publish(actor) {
        if (this.lockSet.has(actor.id)) {
            return;
        }
        else {
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
            let newSnap = new Snap_1.default(actor, index, latestEventIndex);
            await this.eventstore.createSnap(newSnap);
        }
        this.lockSet.delete(actor.id);
        if (actor[uncommittedEvents].length) {
            this.publish(actor);
        }
    }
    // todo
    async rollback(sagaId) {
    }
}
exports.default = EventBus;
//# sourceMappingURL=EventBus.js.map