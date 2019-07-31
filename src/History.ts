import { Actor } from "./Actor";
import { Event } from "./types/Event";
import { cloneDeep } from "lodash";

export class History {
  private index = 0;
  private currentActor: Actor;
  constructor(private protoActor: Actor, private events: Event[]) {
    this.currentActor = cloneDeep(this.protoActor);
    events.forEach(e => this.currentActor.$updater(e));
  }
  get() {
    return this.currentActor;
  }

  getIndex() {
    return this.index;
  }

  next() {
    if (this.index >= this.events.length) {
      return this.currentActor;
    }
    const events = this.events.slice(this.index, this.index + 1);
    events.forEach(e => this.currentActor.$updater(e));
  }

  prev() {
    if (this.index === 0) {
      return this.currentActor;
    }
    const events = this.events.slice(this.index - 1, this.index);
    events.forEach(e => this.currentActor.$updater(e));
  }

  latest() {
    this.currentActor = cloneDeep(this.protoActor);
    this.events.forEach(e => this.currentActor.$updater(e));
    return this.currentActor;
  }
}
