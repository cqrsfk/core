import * as uid from "shortid";
import { cloneDeep } from "lodash";
import { Event } from "./types/Event";
import { Context } from "./Context";
import * as sleep from "sleep-promise";

export class Actor {
  _id: string = uid();
  _deleted: boolean = false;
  _rev?: string;
  $type: string;
  $version: number;
  $events: Event[] = [];

  // proxy provider
  $cxt: Context;
  static version: number = 1;

  constructor(...argv: any[]) {
    this.$type = this.statics.type;
    this.$version = this.statics.version;
  }

  static beforeCreate?(argv: any[]) {}
  static created?(actor: Actor) {}

  static get type() {
    return this.name;
  }

  static json<T extends Actor>(actor: T): any {
    return JSON.parse(JSON.stringify(actor));
  }

  static parse<T extends Actor>(json): T {
    json = cloneDeep(json);
    json.__proto__ = this.prototype;
    json.constructor = this;
    return json as T;
  }

  get statics() {
    return <typeof Actor>this.constructor;
  }

  get json() {
    return this.statics.json(this);
  }

  async save(): Promise<PouchDB.Core.Response> {
    const json = this.json;
    const result = await this.$cxt.db.put(json);
    this._rev = result.rev;
    this.$events = [];
    await sleep(10);
    return result;
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

  async remove() {
    if (this._rev) {
      const result = await this.$cxt.db.remove(this._id, this._rev);
      this._rev = result.rev;
      this._deleted = true;
      return result;
    }
  }

  $updater(event: Event) {
    const method = event.type;
    if (this[method + "Handle"]) {
      this[method + "Handle"](event);
    }
  }
}
