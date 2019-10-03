import { Actor } from "./Actor";
import { Event } from "./types/Event";
import { Action } from "./decorators/Action";
import { Changer } from "./decorators/Changer";

export abstract class Saga extends Actor {
  private finish = false;
  private actorInfos: { type: string; rev?: string; id: string }[] = [];

  constructor() {
    super();
  }

  @Action()
  async recover() {
    if (this.finish) return;
    let events: Event[] = [];
    for (let info of this.actorInfos) {
      const { rev, id, type } = info;
      const act = await this.$cxt.get(type, id);
      if (act) {
        const history = await act.history();
        events = [...events, ...history.getUndoneEvents(this._id)];
      }
    }

    await this.recoverHandle(events);
    await this.end();
  }

  abstract recoverHandle(events: Event[]): Promise<void>;

  @Action()
  async begin(acts: Actor[]) {
    if (this.finish) return;

    this.$cxt.apply("begin", acts);
    await this.save();
  }

  @Changer("begin")
  private setActorInfos(event) {
    for (let act of event.data) {
      const type = act.$type;
      this.actorInfos.push({
        type,
        id: act._id,
        rev: act._rev
      });
    }
  }

  @Action()
  async end() {
    if (this.finish) return;
    this.$cxt.apply("finish", []);
    await this.save();
  }

  @Changer("finish")
  private setFinish() {
    this.finish = true;
  }
}
