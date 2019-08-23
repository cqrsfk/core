import * as uid from "shortid";
import { cloneDeep } from "lodash";
import { Event } from "./types/Event";
import { Context } from "./Context";
import * as sleep from "sleep-promise";
import { History } from "./History";
import "reflect-metadata";

export class Actor {
  _id: string = uid();
  _deleted: boolean = false;
  _rev?: string;
  $type: string;
  $events: Event[] = [];
  $version: number;
  $listeners: any = {};

  // proxy provide
  $sagaId: string;
  $sync;
  $stopSync;
  $recoverEventId: string;
  $cxt: Context;

  constructor(...argv: any[]) {
    this.$type = this.statics.type;
    this.$version = this.statics.version;
  }

  static beforeCreate?(argv: any[]) {}
  static created?(actor: Actor) {}

  static get type() {
    return this.name;
  }

  static version = 1.0;

  static json(actor): any {
    return JSON.parse(JSON.stringify(actor));
  }

  static parse(json): any {
    json = cloneDeep(json);
    json.__proto__ = this.prototype;
    json.constructor = this;
    return json;
  }

  get statics() {
    return <typeof Actor>this.constructor;
  }

  get json() {
    return this.statics.json(this);
  }

  beforeSave;
  afterSave;

  async save(force = false): Promise<PouchDB.Core.Response | void> {
    if (!force && !this.$events.length) return;

    if (this.beforeSave) {
      await this.beforeSave();
    }

    for (let evt of this.$events) {
      const l = this.$listeners[evt.type];
      if (l) {
        for (let id in l) {
          const handles = l[id];
          for (let h of handles) {
            const [type, id, method] = (h as string).split(".");
            const act = await this.$cxt.get(type, id);
            await act[method](evt);
          }
        }
      }
    }

    const json = this.json;
    let result = await this.$cxt.db.put(json);
    this._rev = result.rev;
    this.$events = [];

    await sleep(10);

    if (this.afterSave) {
      await this.afterSave();
    }

    return result;
  }

  async subscribe({
    event,
    type,
    id,
    method
  }: {
    type: string;
    event: string;
    id: string;
    method: string;
  }) {
    let l = this.$listeners[event];
    if (!l) {
      l = this.$listeners[event] = {};
    }
    if (!l[id]) {
      l[id] = [];
    }

    const lset = new Set(l[id]);
    lset.add(`${type}.${id}.${method}`);

    l[id] = [...lset];
    return await this.save(true);
  }

  async unsubscribe({
    event,
    type,
    id,
    method
  }: {
    type: string;
    event: string;
    id: string;
    method: string;
  }) {
    const l = this.$listeners[event];
    if (l && l[id]) {
      const lset = new Set(l[id]);
      lset.delete(`${type}.${id}.${method}`);
      l[id] = [...lset];
      return await this.save(true);
    }
  }

  async history(): Promise<History> {
    const row = await this.$cxt.db.get(this._id, {
      revs: true
    });

    let protoActor: Actor = this;
    const events: Event[] = [];

    if (row._revisions) {
      let start = row._revisions.start;
      let ids = row._revisions.ids.reverse();
      for (let i = 0; i < start; i++) {
        const item = await this.$cxt.db.get<Actor>(this._id, {
          rev: i + 1 + "-" + ids[i]
        });
        events.push(...item.$events);
        if (i === 0) protoActor = this.statics.parse(item);
      }
    }
    events.push(...this.$events);
    const history = new History(protoActor, events);

    return history;
  }

  async refresh() {
    const latestJSON = await this.$cxt.db.get("mydoc");
    if (latestJSON._rev === this._rev) return;

    const latestActor = this.statics.parse(latestJSON);
    for (let k in latestActor) {
      if (latestActor.hasOwnProperty(k)) {
        this[k] = latestActor[k];
      }
    }
  }

  beforeRemove;
  afterRemove;

  removed(rev) {
    this._deleted = true;
    this._rev = rev;
  }

  async remove() {
    if (this._rev) {
      this.beforeRemove && (await this.beforeRemove());
      const result = await this.$cxt.db.remove(this._id, this._rev);
      this.$cxt.apply("removed", result.rev);
      this.afterRemove && (await this.afterRemove());
      return result;
    }
  }

  $updater(event: Event): any {
    const changers = Reflect.getMetadata("changers", this.constructor) || {};
    const method = changers[event.type];
    if (method && this[method]) {
      return this[method](event);
    }
  }
}
