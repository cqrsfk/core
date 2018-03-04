import Actor from "./Actor";
export default class Snap {
    readonly index: number;
    readonly latestEventIndex: number;
    readonly id: string;
    readonly date: Date;
    readonly actorId: string;
    readonly actorType: string;
    readonly data: any;
    constructor(actor: Actor, index?: number, latestEventIndex?: number);
    readonly json: {
        id: string;
        latestEventIndex: number;
        date: Date;
        actorId: string;
        actorType: string;
        data: any;
        index: number;
    };
    static parse(data: any): Snap;
}
