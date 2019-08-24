import { Actor } from "./Actor";
import { Event } from "./types/Event";
import { cloneDeep } from "lodash";

export class History {
  private index = 0;
  private currentActor: Actor;
  constructor(private protoActor: Actor, public readonly events: Event[]) {
    this.currentActor = cloneDeep(this.protoActor);
  }
  get<T extends Actor>() {
    return this.currentActor as T;
  }

  getIndex() {
    return this.index;
  }

  next<T extends Actor>() {
    if (this.index >= this.events.length) {
      return this.currentActor as T;
    }
    const events = this.events.slice(0, ++this.index);
    this.currentActor = cloneDeep(this.protoActor);
    events.forEach(e => this.currentActor.$updater(e));
    return this.currentActor as T;
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

  prev<T extends Actor>() {
    if (this.index === 0) {
      return this.currentActor as T;
    }
    const events = this.events.slice(0, --this.index);
    this.currentActor = cloneDeep(this.protoActor);
    events.forEach(e => this.currentActor.$updater(e));
    return this.currentActor as T;
  }

  latest<T extends Actor>() {
    this.currentActor = cloneDeep(this.protoActor);
    this.events.forEach(e => this.currentActor.$updater(e));
    return this.currentActor as T;
  }
}
