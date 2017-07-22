"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Snap_1 = require("./Snap");
const reborn_1 = require("./reborn");
const events_1 = require("events");
class Repository extends events_1.EventEmitter {
    constructor(ActorClass, eventstore, oldActorClassMap) {
        super();
        this.ActorClass = ActorClass;
        this.eventstore = eventstore;
        this.oldActorClassMap = oldActorClassMap;
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
    async getHistory(actorId) {
        const snap = await this.eventstore.getSnapshotByIndex(actorId, 0);
        const events = await this.eventstore.getEvents(actorId);
        if (snap) {
            return {
                _events: events,
                _snap: snap,
                _index: events.length,
                _validateIndex(index) {
                    return index > 0 && index <= this._events.length;
                },
                done: false,
                data: reborn_1.default(this.ActorClass, snap, events).json,
                _get(index) {
                    if (this._validateIndex(index)) {
                        let events = this._events.slice(0, index);
                        this.data = reborn_1.default(this.ActorClass, this._snap, events).json;
                        this.done = false;
                    }
                    else {
                        this.done = true;
                    }
                    return this;
                },
                next() {
                    let index = this._index++;
                    return this._get(index);
                },
                prev() {
                    let index = this._index++;
                    return this._get(index);
                }
            };
        }
        throw new Error("no actor by " + actorId);
    }
    async get(id) {
        let actor = this.getFromCache(id);
        if (actor) {
            return actor;
        }
        else {
            this.emit("reborn", id);
            let snap = await this.eventstore.getLatestSnapshot(id);
            if (snap) {
                const events = await this.eventstore.getEventsBySnapshot(snap.id);
                if (this.ActorClass.version !== snap.actorVersion) {
                    let type = this.ActorClass.getType();
                    const map = this.oldActorClassMap.get(type);
                    const oldClass = map.get(snap.actorVersion);
                    let actor = reborn_1.default(oldClass, snap, events);
                    actor = this.ActorClass.upgrade(actor.json);
                    snap = new Snap_1.default(actor);
                    await this.eventstore.createSnap(snap);
                    this.cache.set(actor.id, actor);
                    return actor;
                }
                else {
                    return reborn_1.default(this.ActorClass, snap, events);
                }
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