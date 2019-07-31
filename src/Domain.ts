import { Actor } from "./Actor";
import { Observer } from "@zalelion/ob";
import { OBMiddle } from "./ob-middle";
import { Change } from "@zalelion/ob-middle-change";
import { Context } from "./Context";
import { Event } from "./types/Event";
import { getAlias } from "./eventAlias";
import { Saga } from "./Saga";
import { EventEmitter } from "events";
import * as sleep from "sleep-promise";

export class Domain {
  private TypeMap = new Map<string, typeof Actor>();
  private TypeDBMap = new Map<string, PouchDB.Database>();
  private db: PouchDB.Database;
  private eventsBuffer: Event[] = [];
  private bus = new EventEmitter();
  private publishing = false;

  private actorBuffer = new Map();

  constructor({ db }: { db: PouchDB.Database }) {
    this.db = db;
    this.reg = this.reg.bind(this);
    this.create = this.create.bind(this);
    this.get = this.get.bind(this);
    this.find = this.find.bind(this);
    this.findRows = this.findRows.bind(this);
    this.changeHandle = this.changeHandle.bind(this);
    db.changes({
      since: "now",
      live: true,
      include_docs: true
    }).on("change", this.changeHandle);

    this.reg(Saga, db);
  }

  reg<T extends typeof Actor>(Type: T, db?: PouchDB.Database) {
    this.TypeMap.set(Type.type, Type);
    if (db) {
      this.TypeDBMap.set(Type.type, db);
      db.changes({
        since: "now",
        live: true,
        include_docs: true
      }).on("change", this.changeHandle);
    }
  }

  async create<T extends Actor>(type: string, argv: any[]) {
    const Type = this.TypeMap.get(type);
    if (Type) {
      Type.beforeCreate && (await Type.beforeCreate(argv));
      const actor = new Type(...argv);
      this.actorBuffer.set(actor._id, actor);
      const p = this.observe<T>(actor);
      await p.save();
      return p;
    } else throw new Error(type + " type no exist ! ");
  }

  private changeHandle({
    doc,
    deleted
  }: PouchDB.Core.ChangesResponseChange<Actor>) {
    if (doc) {
      const { _rev, $type, $events, $version, _id } = doc;
      const pn = _rev.split("-")[0];
      if (pn === "1") {
        const createEvent: Event = {
          type: "created",
          data: doc,
          actorId: _id,
          actorType: $type,
          actorVersion: $version,
          actorRev: _rev,
          createTime: Date.now()
        };
        this.eventsBuffer.push(createEvent);
      } else if (deleted) {
        const deleteEvent: Event = {
          type: "deleted",
          data: doc,
          actorId: _id,
          actorType: $type,
          actorVersion: $version,
          actorRev: _rev,
          createTime: Date.now()
        };
        this.eventsBuffer.push(deleteEvent);
      } else {
        this.eventsBuffer.push(...$events);
      }

      this.publish();
    }
  }

  async publish() {
    if (this.publishing) {
      return;
    }
    this.publishing = true;
    const event = this.eventsBuffer.shift();
    if (event) {
      const eventNames = getAlias(event);
      eventNames.forEach(e => {
        this.bus.emit(e, event);
      });
      await sleep(0);
      this.publishing = false;
      await this.publish();
    } else {
      this.publishing = false;
    }
  }

  once(
    event:
      | {
          actor?: string;
          type?: string;
          id?: string;
        }
      | string,
    listener
  ) {
    this.on(event, listener, true);
  }

  on(
    event:
      | {
          actor?: string;
          type?: string;
          id?: string;
        }
      | string,
    listener,
    once = false
  ) {
    let eventname;
    if (typeof event === "string") eventname = event;
    else eventname = this.getEventName(event);
    if (once) this.bus.once(eventname, listener);
    else this.bus.on(eventname, listener);
  }

  getEventName({
    actor = "",
    type = "",
    id = ""
  }: {
    actor?: string;
    type?: string;
    id?: string;
  }) {
    return `${actor}.${id}.${type}`;
  }

  removeListener(eventname, listener) {
    this.bus.removeListener(eventname, listener);
  }
  removeAllListeners(eventname?: string) {
    this.bus.removeAllListeners(eventname);
  }

  private observe<T extends Actor>(actor, holderId?: string) {
    const ob = new Observer<T>(actor);
    const { proxy, use } = ob;
    const cxt = new Context(this.db, proxy, this);
    use(new Change(ob));
    use(new OBMiddle(ob, cxt, holderId));
    return proxy;
  }

  async get<T extends Actor>(type: string, id: string, holderId?: string) {
    const actor = await this.nativeGet(type, id);
    return this.observe<T>(actor, holderId);
  }
  private async nativeGet<T extends Actor>(type: string, id: string) {
    const doc = this.actorBuffer.get(id);
    if (doc) return doc;
    const Type = this.TypeMap.get(type);
    if (Type) {
      const db = this.TypeDBMap.get(Type.type) || this.db;
      const row = await db.get(id);
      if (row) {
        this.actorBuffer.set(id, row);
        const actor = Type.parse(row);
        return actor;
      }
      return null;
    } else throw new Error(type + " type no exist ! ");
  }

  async findRows(
    type: string,
    params: PouchDB.Find.FindRequest<{}>
  ): Promise<any[]> {
    const Type = this.TypeMap.get(type);
    if (Type) {
      const db = this.TypeDBMap.get(Type.type) || this.db;
      const { docs } = await db.find(params);
      return docs;
    } else throw new Error(type + " type no exist ! ");
  }

  async find<T extends Actor>(
    type: string,
    params: PouchDB.Find.FindRequest<{}>
  ): Promise<T[]> {
    const Type = this.TypeMap.get(type);
    if (Type) {
      const docs = await this.findRows(type, params);
      return docs.map(doc => {
        const actor = Type.parse(doc);
        return this.observe<T>(actor);
      });
    } else throw new Error(type + " type no exist ! ");
  }
}
