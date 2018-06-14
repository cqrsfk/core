"use strict";
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
    async create(data) {
        const actor = new this.ActorClass(data);
        const snap = new Snap_1.default(actor);
        await this.eventstore.createSnap(snap);
        this.cache.set(actor.id, actor);
        setImmediate(() => this.emit("create", actor.json));
        return actor;
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
    async getHistory(actorId, actorType) {
        const snap = await this.eventstore.getSnapshotByIndex(actorId, 0);
        const events = await this.eventstore.getEvents(actorId);
        if (snap) {
            return new History_1.default(this.ActorClass, snap, events, actorType);
        }
        throw new Error("no actor by " + actorId);
    }
    async get(id) {
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
            let snap = await this.eventstore.getLatestSnapshot(id);
            if (snap) {
                const events = await this.eventstore.getEventsBySnapshot(snap.id);
                return reborn_1.default(this.ActorClass, snap, events);
            }
        }
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