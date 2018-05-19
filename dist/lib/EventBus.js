"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const eventAlias_1 = require("./eventAlias");
const Snap_1 = require("./Snap");
const latestEventIndex = Symbol.for("latestEventIndex");
const uncommittedEvents = Symbol.for("uncommittedEvents");
class EventBus {
    constructor(eventstore, domain, repositorieMap, ActorClassMap) {
        // for (let [ActorClass, repo] of repositorieMap) {
        //     repo.on("create", json => {
        //         const alias = getAlias({ type: "create", actorType: ActorClass.getType(), actorId: json.id });
        //         for (let name of alias) {
        //             this.emitter.emit(name, json);
        //         }
        //     });
        // }
        this.eventstore = eventstore;
        this.domain = domain;
        this.repositorieMap = repositorieMap;
        this.ActorClassMap = ActorClassMap;
        this.emitter = new events_1.EventEmitter();
        this.lockSet = new Set();
        this.subscribeRepo = new Map();
        this.eventstore.on("saved events", events => {
            for (let event of events) {
                const alias = eventAlias_1.getAlias(event);
                for (let name of alias) {
                    process.nextTick(() => {
                        this.emitter.emit(name, event);
                        const s = this.subscribeRepo.get(name);
                        if (s) {
                            for (let handle of s) {
                                this.domain.get(handle.actorType, handle.actorId).then(actor => {
                                    actor[handle.method](event);
                                });
                            }
                        }
                        this.subscribeRepo.delete(name);
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
            actor[latestEventIndex] = evt.index = index + startIndex;
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
            await this.publish(actor);
        }
    }
    async rollback(sagaId) {
        await this.eventstore.killSaga(sagaId);
        const events = await this.eventstore.findEventsBySagaId(sagaId);
        await this.eventstore.removeEventsBySagaId(sagaId);
        events.forEach(event => {
            const Class = this.ActorClassMap.get(event.actorType);
            const repo = this.repositorieMap.get(Class);
            repo.clear(event.actorId);
        });
    }
}
exports.default = EventBus;
//# sourceMappingURL=EventBus.js.map