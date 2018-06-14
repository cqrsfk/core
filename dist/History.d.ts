import Event from "./Event";
import Snap from "./Snap";
import ActorConstructor from "./ActorConstructor";
export default class History {
    private ActorClass;
    private lastSnap;
    events: Event[];
    private eventType?;
    index: number;
    constructor(ActorClass: ActorConstructor, lastSnap: Snap, events: Event[], eventType?: string);
    private validateIndex;
    get(index: any): any;
    next(): any;
    prev(): any;
}
