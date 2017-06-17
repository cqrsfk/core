import Snap from "./snap";
import Event from "./event";
import { Actor, ActorConstructor } from "./Actor";
export default function reborm(ActorClass: ActorConstructor, snap: Snap, events: Event[]): Actor;
