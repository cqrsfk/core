import { Actor } from "./Actor";
import { Event } from "./types/Event";
import { cloneDeep } from "lodash";

export class History {
  private index = 0;
  private currentActor: Actor;
  constructor(private protoActor: Actor, public readonly events: Event[]) {
    this.currentActor = cloneDeep(this.protoActor);
    
    // events.forEach(e => this.currentActor.$updater(e));
  }
  get<T extends Actor>() {
    return this.currentActor as T;
  }

  getIndex() {
    return this.index;
  }

  next() {
    if (this.index >= this.events.length) {
      return this.currentActor;
    }
    const events = this.events.slice(0, ++this.index);
    events.forEach(e => this.currentActor.$updater(e));
  }

  getUndoneEvents(sagaId) {
    const events = this.events.filter(evt => evt.sagaId === sagaId);
    const recoverEventIds: string[] = [];

    for (let evt of this.events) {
      if (evt.recoverEventId) {
        recoverEventIds.push(evt.recoverEventId);
      }
    }

    return events.filter(
      evt => !recoverEventIds.includes(evt.sagaId as string)
    );
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
