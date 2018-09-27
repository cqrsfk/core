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
const Snap_1 = require("./Snap");
const reborn_1 = require("./reborn");
const events_1 = require("events");
const History_1 = require("./History");
const setdata = Symbol.for("setdata");
class Repository extends events_1.EventEmitter {
    constructor(ActorClass, eventstore, roleMap) {
        super();
        this.ActorClass = ActorClass;
        this.eventstore = eventstore;
        this.roleMap = roleMap;
        this.cache = new Map();
    }
    create(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const actor = new this.ActorClass(data);
            const snap = new Snap_1.default(actor);
            yield this.eventstore.createSnap(snap);
            this.cache.set(actor.id, actor);
            setImmediate(() => this.emit("create", actor.json));
            return actor;
        });
    }
    clear(id) {
        if (this.cache.has(id)) {
            this.cache.delete(id);
            this.emit("clear", id);
        }
    }
    getFromCache(id) {
        return this.cache.get(id);
    }
    getHistory(actorId, actorType) {
        return __awaiter(this, void 0, void 0, function* () {
            const snap = yield this.eventstore.getSnapshotByIndex(actorId, 0);
            const events = yield this.eventstore.getEvents(actorId);
            if (snap) {
                return new History_1.default(this.ActorClass, snap, events, actorType);
            }
            throw new Error("no actor by " + actorId);
        });
    }
    get(id) {
        return __awaiter(this, void 0, void 0, function* () {
            let actor = this.getFromCache(id);
            if (actor) {
                if (actor.json.isAlive) {
                    return actor;
                }
                else {
                    this.cache.delete(id);
                    return null;
                }
            }
            else {
                this.emit("reborn", id);
                let snap = yield this.eventstore.getLatestSnapshot(id);
                if (snap) {
                    const events = yield this.eventstore.getEventsBySnapshot(snap.id);
                    return reborn_1.default(this.ActorClass, snap, events);
                }
            }
        });
    }
    exist(id) {
        return this.cache.has(id);
    }
    getCacheActorIds() {
        return [...this.cache.keys()];
    }
}
exports.default = Repository;
//# sourceMappingURL=Repository.js.map