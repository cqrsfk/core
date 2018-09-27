"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const eventAlias_1 = require("./eventAlias");
const Snap_1 = require("./Snap");
const sleep_1 = require("./sleep");
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
    publish(actor) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.lockSet.has(actor.id)) {
                return;
            }
            else {
                this.lockSet.add(actor.id);
            }
            const event = yield this.eventstore.getLatestEvent(actor.id);
            let startIndex = event ? event.index + 1 : 0;
            let events = actor[uncommittedEvents].map(function (evt, index) {
                actor[latestEventIndex] = evt.index = index + startIndex;
                return evt;
            });
            yield this.eventstore.saveEvents(events);
            actor[uncommittedEvents] = [];
            let snap = yield this.eventstore.getLatestSnapshot(actor.id);
            let lastEvent = events[events.length - 1];
            if (lastEvent.index - snap.lastEventId > 10) {
                let latestEventIndex = lastEvent.index;
                let index = snap.index + 1;
                let newSnap = new Snap_1.default(actor, index, latestEventIndex);
                yield this.eventstore.createSnap(newSnap);
            }
            this.lockSet.delete(actor.id);
            if (actor[uncommittedEvents].length) {
                yield this.publish(actor);
            }
        });
    }
    rollback(sagaId) {
        return __awaiter(this, void 0, void 0, function* () {
            yield sleep_1.default(100);
            yield this.eventstore.killSaga(sagaId);
            const events = yield this.eventstore.findEventsBySagaId(sagaId);
            yield this.eventstore.removeEventsBySagaId(sagaId);
            events.forEach(event => {
                const Class = this.ActorClassMap.get(event.actorType);
                const repo = this.repositorieMap.get(Class);
                repo.clear(event.actorId);
            });
        });
    }
}
exports.default = EventBus;
//# sourceMappingURL=EventBus.js.map