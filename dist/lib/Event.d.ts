import { Actor } from "./Actor";
export default class Event {
    readonly data: any;
    readonly type: string;
    readonly method: string;
    readonly sagaId: string;
    readonly direct: boolean;
    readonly actorId: string;
    readonly actorType: string;
    readonly actorVersion: string;
    readonly id: string;
    readonly date: Date;
    readonly alias: string[];
    index: number;
    constructor(actor: Actor, data: any, type: string, method: string, sagaId?: string, direct?: boolean);
    readonly json: any;
    static toJSON(event: Event): any;
    private static _toJSON(data);
    static parse(data: any): Event;
}
