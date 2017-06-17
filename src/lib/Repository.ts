import { Actor, ActorConstructor } from "./Actor";
import EventStore from "./DefaultEventStore";
import Snap from "./Snap";
import uuid from "uuid/v4";
import reborn from "./reborn";

export default class Repository {

    private cache: Map<string, Actor> = new Map();

    constructor(
        private ActorClass: ActorConstructor,
        private eventstore: EventStore,
        private ActorClasses: Map<string, ActorConstructor>,
        private domain: any) { }

    async create(data: any) {

        const actor = new this.ActorClass(data);
        const snap = new Snap(actor);
        await this.eventstore.createSnap(snap);
        this.cache.set(actor.id, actor);

    }

    clear(id) {
        this.cache.delete(id);
    }

    getFromCache(id) {
        this.cache.get(id);
    }

    async get(id): Promise<Actor> {

        let actor;
        if (actor = this.getFromCache(id)) {
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