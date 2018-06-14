import Event from "./Event";
import Snap from "./Snap";
import ActorConstructor from "./ActorConstructor";
import reborn from "./reborn";
const _ = require("lodash");

export default class History {
  public index: number;
  constructor(private ActorClass: ActorConstructor, private lastSnap: Snap, public events: Event[], private eventType?: string) {
    this.index = events.length - 1;
  }
  private validateIndex(index) {
    return index >= -1 && index < this.events.length;
  }

  get(index) {

    if (index === undefined) {
      index = this.index;
    }

    if (this.validateIndex(index)) {

      if (index !== -1 && this.eventType) {
        let _index = _.findLastIndex(this.events.slice(0, index + 1), { type: this.eventType });
        if (_index === -1) {
          return null;
        } else {
          index = _index;
        }
      }

      let events = this.events.slice(0, index + 1);
      this.index = index;
      return reborn(this.ActorClass, this.lastSnap, events).json;
    } else {
      return null;
    }
  }
  next() {
    return this.get(1 + this.index);
  }
  prev() {
    return this.get(this.index - 1);
  }
}
