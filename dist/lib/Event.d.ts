import { Actor } from "./Actor";
export default class Event {
    readonly index: number;
    readonly data: any;
    readonly type: string;
    readonly method: string;
    readonly sagaId: string;
    readonly actorId: string;
    readonly actorType: string;
    readonly actorVersion: string;
    readonly id: string;
    readonly date: Date;
    readonly alias: string[];
    constructor(actor: Actor, index: number, data: any, type: string, method: string, sagaId?: string);
    readonly json: any;
    static toJSON(event: Event): any;
    private static _toJSON(data);
    static parse(data: any): Event;
}
