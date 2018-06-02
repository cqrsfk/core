const loadEvents = Symbol.for('loadEvents');
import Snap from "./snap";
import Event from "./event";
import ActorConstructor from "./ActorConstructor";
import Actor from "./Actor";
export const setdata = Symbol.for("setdata");

export default function reborm(ActorClass: ActorConstructor, snap: Snap, events: Event[]): Actor {
    const actor = ActorClass.parse(snap.data);
    actor[loadEvents](events);
    return actor;
};
