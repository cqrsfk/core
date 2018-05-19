const loadEvents = Symbol.for('loadEvents');
import Snap from "./snap";
import Event from "./event";
import ActorConstructor from "./ActorConstructor";
import Actor from "./Actor";
export const setdata = Symbol.for("setdata");

export default function reborm(ActorClass: ActorConstructor, snap: Snap, events: Event[],roleMap): Actor {

    const actor = ActorClass.parse(snap.data);
    events.forEach(event=>{

      let role = roleMap.get(event.roleName);

      let updater = actor.updater[event.type] ||
                    actor.updater[event.method+"Update"] ||
                    (role ? role.updater[event.type] || role.updater[event.method] : null);

      const updatedData = updater ? updater(actor.json,event) : {};
      actor[setdata] = Object.assign({}, actor.json, updatedData );
    });
    return actor;
};
