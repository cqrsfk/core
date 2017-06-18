"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Snap_1 = require("./Snap");
const reborn_1 = require("./reborn");
class Repository {
    constructor(ActorClass, eventstore) {
        this.ActorClass = ActorClass;
        this.eventstore = eventstore;
        this.cache = new Map();
    }
    async create(data) {
        const actor = new this.ActorClass(data);
        const snap = new Snap_1.default(actor);
        await this.eventstore.createSnap(snap);
        this.cache.set(actor.id, actor);
        return actor;
    }
    clear(id) {
        this.cache.delete(id);
    }
    getFromCache(id) {
        return this.cache.get(id);
    }
    async get(id) {
        let actor = this.getFromCache(id);
        if (actor) {
            return actor;
        }
        else {
            const snap = await this.eventstore.getLatestSnapshot(id);
            if (snap) {
                const events = await this.eventstore.getEventsBySnapshot(snap.id);
                const actor = reborn_1.default(this.ActorClass, snap, events);
                return actor;
            }
        }
    }
    exist(id) {
        return this.cache.has(id);
    }
}
exports.default = Repository;
//# sourceMappingURL=Repository.js.map