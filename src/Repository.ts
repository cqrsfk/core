import ActorConstructor from "./ActorConstructor";
import Actor from "./Actor";
import EventStore from "./DefaultEventStore";
import Snap from "./Snap";
import reborn from "./reborn";
import { EventEmitter } from "events";
import Role from "./Role";
import History from "./History";
const setdata = Symbol.for("setdata")

export default class Repository extends EventEmitter {

    private cache: Map<string, Actor> = new Map();

    constructor(
        private ActorClass: ActorConstructor,
        private eventstore: EventStore,
        private roleMap:Map<string,Role>

    ) {
        super();
    }

    async create(data: any): Promise<Actor> {

        const actor = new this.ActorClass(data);
        const snap = new Snap(actor);
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

    getFromCache(id): Actor {
        return this.cache.get(id);
    }

    async getHistory(actorId: string,actorType?:string) {
        const snap = await this.eventstore.getSnapshotByIndex(actorId, 0);
        const events = await this.eventstore.getEvents(actorId);
        if (snap) {
            return new History(this.ActorClass,snap,events,actorType);
        }
        throw new Error("no actor by " + actorId);
    }

    async get(id): Promise<Actor> {

        let actor: Actor = this.getFromCache(id);
        if (actor) {
            if(actor.json.isAlive){
              return actor;
            }else{
              this.cache.delete(id);
              return null;
            }
        } else {
            this.emit("reborn", id);
            let snap: Snap = await this.eventstore.getLatestSnapshot(id);
            if (snap) {
                const events = await this.eventstore.getEventsBySnapshot(snap.id);
                return reborn(this.ActorClass, snap, events);
            }
        }
    }

    exist(id) {
        return this.cache.has(id);
    }

    getCacheActorIds() {
        return [...this.cache.keys()]
    }
}
