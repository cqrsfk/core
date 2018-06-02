import Snap from "./snap";
import Event from "./event";
import ActorConstructor from "./ActorConstructor";
import Actor from "./Actor";
export declare const setdata: unique symbol;
export default function reborm(ActorClass: ActorConstructor, snap: Snap, events: Event[]): Actor;
