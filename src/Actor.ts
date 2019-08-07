import * as uid from "shortid";
import { cloneDeep } from "lodash";
import { Event } from "./types/Event";
import { Context } from "./Context";
import * as sleep from "sleep-promise";
import { History } from "./History";

export class Actor {
  _id: string = uid();
  _deleted: boolean = false;
  _rev?: string;
  $type: string;
  $version: number;
  $events: Event[] = [];
  $lockSagaId: string;
  $sync;
  $syncReact;

  // proxy provider
  $cxt: Context;
  static version: number = 1;
  static lockFields: string[] = [];

  constructor(...argv: any[]) {
    this.$type = this.statics.type;
    this.$version = this.statics.version;
  }

  static beforeCreate?(argv: any[]) {}
  static created?(actor: Actor) {}

  static get type() {
    return this.name;
  }

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

  async $recover(sagaId: string, rev: string) {
    if (this.$lockSagaId && sagaId === this.$lockSagaId) {
      const doc = await this.$cxt.db.get(this._id, { rev });
      this.statics.lockFields.forEach(key => {
        this[key] = doc[key];
      });
      return await this.save();
    }
  }

  beforeSave;
  afterSave;

  async save(): Promise<PouchDB.Core.Response> {
    if (this.beforeSave) {
      await this.beforeSave();
    }

    const json = this.json;
    const result = await this.$cxt.db.put(json);
    this._rev = result.rev;
    this.$events = [];
    await sleep(10);

    if (this.afterSave) {
      await this.afterSave();
    }

    return result;
  }

  async $lock(sagaId: string) {
    if (this.$lockSagaId) {
      throw new Error("locked");
    }
    this.$lockSagaId = sagaId;
    return await this.save();
  }

  async $unlock(sagaId: string) {
    if (this.$lockSagaId === sagaId) {
      delete this.$lockSagaId;
      return this.save();
    }
    throw new Error("locked");
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

  async sync() {
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
    const method = event.type;
    if (this[method]) {
      const argv = Array.isArray(event.data) ? [...event.data] : [event.data];
      return this[method](...argv);
    }
  }
}
