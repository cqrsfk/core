import { Actor } from "./Actor";

export class Saga extends Actor {
  public finished: boolean = false;
  private actorInfo: { [id: string]: { type: string; rev: string } } = {};
  constructor() {
    super();
  }

  async lockGet<T extends Actor>(type: string, id: string) {
    const actor = await this.$cxt.get<T>(type, id);
    if (!actor) return null;
    await actor.$lock(this._id);
    this.actorInfo = Object.assign({}, this.actorInfo, {
      [actor._id]: { type: actor.$type, rev: actor._rev }
    });

    await this.save();
    return actor as T;
  }

  async end() {
    for (let aid in this.actorInfo) {
      let { type, rev } = this.actorInfo[aid];
      const actor = await this.$cxt.get(type, aid);
      await actor.$unlock(this._id);
    }
    await this.save();
    this.$cxt.apply("finish", []);
  }

  finish() {
    this.finished = true;
  }

  async recover() {
    if (!this.finished) {
      for (let aid in this.actorInfo) {
        let { type, rev } = this.actorInfo[aid];
        const actor = await this.$cxt.get(type, aid);
        await actor.$recover(this._id, rev);
      }
    }
  }
}
