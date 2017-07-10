import { Actor, ActorConstructor } from "./Actor";
import EventStore from "./DefaultEventStore";
import Snap from "./Snap";
import uuid from "uuid/v4";
import reborn from "./reborn";
import { EventEmitter } from "events";

export default class Repository extends EventEmitter {

    private cache: Map<string, Actor> = new Map();

    constructor(
        private ActorClass: ActorConstructor,
        private eventstore: EventStore) {
        super();
    }

    async create(data: any): Promise<Actor> {

        const actor = new this.ActorClass(data);
        const snap = new Snap(actor);
        await this.eventstore.createSnap(snap);
        this.cache.set(actor.id, actor);
        return actor;
    }

    clear(id) {
        if (this.cache.has(id)) {
            this.cache.delete(id);
            this.emit("clear", id);
        }
    }

    getFromCache(id): Actor {
        return this.cache.get(id);
    }

    async getHistory(actorId: string) {
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
                data: reborn(this.ActorClass, snap, events).json,
                _get(index) {
                    if (this._validateIndex(index)) {
                        let events = this._events.slice(0, index);
                        this.data = reborn(this.ActorClass, this._snap, events).json;
                        this.done = false;
                    } else {
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
            }

        }
        throw new Error("no actor by " + actorId);
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