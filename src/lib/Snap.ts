const uuid = require("uuid").v1;
import  Actor from "./Actor";

export default class Snap {

    readonly id: string
    readonly date: Date
    readonly actorId: string
    readonly actorType: string
    readonly data: any

    constructor(actor: Actor, public readonly index: number = 0, public readonly latestEventIndex: number = -1) {
        this.id = uuid();
        this.date = new Date();
        this.actorId = actor.id;
        this.actorType = actor.type;
        this.data = actor.json;
    }

    get json() {
        let { id, latestEventIndex, date, actorId, actorType, data, index } = this;
        return { id, latestEventIndex, date, actorId, actorType, data, index };
    }

    static parse(data): Snap {
        let snap = JSON.parse(JSON.stringify(data));
        snap.__proto__ = Snap.prototype;
        return snap;
    }
}
