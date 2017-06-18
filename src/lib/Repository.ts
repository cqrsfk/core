import { Actor, ActorConstructor } from "./Actor";
import EventStore from "./DefaultEventStore";
import Snap from "./Snap";
import uuid from "uuid/v4";
import reborn from "./reborn";

export default class Repository {

    private cache: Map<string, Actor> = new Map();

    constructor(
        private ActorClass: ActorConstructor,
        private eventstore: EventStore) { }

    async create(data: any): Promise<Actor> {

        const actor = new this.ActorClass(data);
        const snap = new Snap(actor);
        await this.eventstore.createSnap(snap);
        this.cache.set(actor.id, actor);
        return actor;
    }

    clear(id) {
        this.cache.delete(id);
    }

    getFromCache(id): Actor {
        return this.cache.get(id);
    }

    async get(id): Promise<Actor> {
        let actor: Actor = this.getFromCache(id);
        if (actor) {
            return actor;
        } else {
            const snap = await this.eventstore.getLatestSnapshot(id);
            if (snap) {
                const events = await this.eventstore.getEventsBySnapshot(snap.id);
                const actor = reborn(this.ActorClass, snap, events);
                return actor;
            }
        }

    }

    exist(id) {
        return this.cache.has(id);
    }
}