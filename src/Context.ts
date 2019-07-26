import { Actor } from "./Actor";
import { Event } from "./types/Event";
import * as uid from "shortid";
import { Domain } from "./Domain";

export class Context {
  constructor(
    public db: PouchDB.Database,
    private actor: Actor,
    private domain_: Domain,
  ) {
    this.get = this.get.bind(this);
    this.apply = this.apply.bind(this);
    this.find = this.find.bind(this);
  }
  async get(id: string) {
    if (id === this.actor._id) return this.actor;
    return this.domain_.get(this.actor.$type, id);
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
}
