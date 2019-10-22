import { Context } from "./Context";
import { Event } from "./types/Event";
import { Actor } from "./Actor";
import "reflect-metadata";
import uid from "shortid";
import { publish } from "./publish";


export class OBMiddle {

  constructor(
    private cxt: Context,
    private $sagaId?: string,
    private $recoverEventId = ""
  ) {
    this.get = this.get.bind(this);
  }

  get({ root, path, parentPath, parent, key, value, ob }) {

    const that = this;

    if (key === "constructor") {
      return parent.constructor;
    }

    if (!parentPath && key === "$cxt") {
      return this.cxt;
    }
    if (
      !parentPath &&
      (
        key === "$sagaId" ||
        key === "$recoverEventId")
    ) {
      return this[key];
    }

    if (!parentPath && key === "save") {
      return async function (force) {
        const events = [...this.$events];
        const result = await value.apply(this, [force]);
        publish(events, that.cxt.domain_.localBus);
        return result;
      };
    }

    if (!parentPath) {
      if (
        value &&
        typeof value === "function"
      ) {
        // mutation
        const mutations =
          Reflect.getMetadata("mutations", root.constructor) || {};
        const mutation = mutations[key];
        if (mutation) {
          const { event, validater } = mutation;
          return function (...argv) {
            if (validater) validater(...argv);

            const actor = root as Actor;
            const myevent: Event = {
              type: event,
              data: argv,
              actorId: actor._id,
              actorType: actor.$type,
              actorVersion: actor.$version,
              id: uid(),
              actorRev: actor._rev,
              createTime: Date.now(),
              sagaId: this.$sagaId,
              recoverEventId: this.$recoverEventId
            };
            actor.$events.push(myevent);
            const result = value.apply(this, argv);

            return result;

          };
        }

        // action
        const actions = Reflect.getMetadata("actions", root.constructor) || {};
        const action = actions[key];
        if (action) {
          const { validater } = action;
          return function (...argv) {
            if (validater) validater(...argv);
            return value.apply(this, argv);
          };
        }

        return value;
      }
    }
    return value;
  }
}
