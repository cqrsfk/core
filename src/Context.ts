import { Actor } from "./Actor";
import { Event } from "./types/Event";
import * as uid from "shortid";
import { Domain } from "./Domain";
import { Saga } from "./Saga";


export class Context {
  constructor(
    public db: PouchDB.Database,
    private actor: Actor,
    private domain_: Domain
  ) {
    this.get = this.get.bind(this);
    this.apply = this.apply.bind(this);
    this.find = this.find.bind(this);
  }
  async get<T extends Actor>(type: string, id: string) {
    if (id === this.actor._id) return this.actor;
    return this.domain_.get<T>(type, id, this.actor._id);
  }
  async find(type: string, req: PouchDB.Find.FindRequest<{}>);
  async find(req: PouchDB.Find.FindRequest<{}>);
  async find(type, req?) {
    if (arguments.length === 1) {
      return this.domain_.find(this.actor.$type, req);
    } else {
      return this.domain_.find(type, req);
    }
  }
  apply(type: string, data) {
    const event: Event = {
      type,
      data,
      actorId: this.actor._id,
      actorType: this.actor.$type,
      actorVersion: this.actor.$version,
      id: uid(),
      actorRev: this.actor._rev,
      createTime: Date.now()
    };
    this.actor.$events.push(event);
    this.actor.$updater(event);
  }
  async createSaga() {
    if (this.actor instanceof Saga) {
      throw new Error("saga instance can't createSaga.");
    }
    return await this.domain_.create<Saga>("Saga", []);
  }
}
