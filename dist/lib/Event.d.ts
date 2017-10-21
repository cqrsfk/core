export default class Event {
    readonly data: any;
    readonly type: string;
    readonly method: string;
    readonly sagaId: string;
    readonly direct: boolean;
    readonly roleName: string;
    readonly actorId: string;
    readonly actorType: string;
    readonly id: string;
    readonly date: Date;
    readonly alias: string[];
    index: number;
    constructor(actor: any, data: any, type: string, method: string, sagaId?: string, direct?: boolean, roleName?: string);
    readonly json: any;
    updatedData: any;
    static toJSON(event: Event): any;
    static parse(data: any): Event;
}
