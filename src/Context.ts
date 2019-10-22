import { Actor } from "./Actor";
import { Saga } from "./Saga";
import { Event } from "./types/Event";
import uid from "shortid";
import { Domain } from "./Domain";

export class Context {
  constructor(
    public db: PouchDB.Database,
    private actor: Actor | Saga,
    public domain_: Domain
  ) {
    this.get = this.get.bind(this);
    this.apply = this.apply.bind(this);
    this.find = this.find.bind(this);
    this.create = this.create.bind(this);
  }
  async get<T extends Actor>(
    type: string,
    id: string,
    recoverEventId = ""
  ): Promise<T | null> {
    if (id === this.actor._id) return this.actor as T;

    return this.actor instanceof Saga
      ? this.domain_.localGet<T>(type, id, this.actor._id, recoverEventId)
      : this.domain_.localGet<T>(type, id);
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
    let event: Event = {
      type,
      data,
      actorId: this.actor._id,
      actorType: this.actor.$type,
      actorVersion: this.actor.$version,
      id: uid(),
      actorRev: this.actor._rev,
      createTime: Date.now(),
      sagaId: this.actor.$sagaId,
      recoverEventId: this.actor.$recoverEventId
    };

    const result = this.actor.$updater(event);
    this.actor.$events.push(event);
    return result;
  }

  async create<T extends Actor>(type: string, argv: any[]) {
    return this.domain_.create<T>(type, argv)
  }

  // subscribe(event: string, id: string, method: string){
  async subscribe({
    event,
    type,
    id,
    method
  }: {
      event: string;
      type: string;
      id: string;
      method: string;
    }) {
    const act = await this.domain_.localGet(type, id);
    if (act) {
      await act.subscribe({
        event,
        type: this.actor.$type,
        id: this.actor._id,
        method
      });
    }
  }

  async unsubscribe({
    type,
    id,
    event,
    method
  }: {
      type: string;
      id: string;
      event: string;
      method: string;
    }) {
    const act = await this.domain_.localGet(type, id);
    if (act) {
      act.unsubscribe({
        event,
        type: this.actor.$type,
        id: this.actor._id,
        method
      });
    }
  }
}
