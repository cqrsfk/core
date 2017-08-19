'use strict';

import { Actor } from "./Actor";
const uuid = require('uuid').v1;
const qs = require('querystring');

// type EventData = {
//     actorId: string
//     actorType: string
//     actorVersion: string
//     id: string
//     type: string
//     method: string
//     sagaId: string
//     date: Date
//     data: any
// }

export default class Event {

    readonly actorId: string
    readonly actorType: string
    readonly actorVersion: string
    readonly id: string
    readonly date: Date
    readonly alias: string[]
    public index: number = 0;

    constructor(
        actor: any,
        public readonly data: any,
        public readonly type: string,
        public readonly method: string,
        public readonly sagaId?: string,
        public readonly direct: boolean = false,

    ) {

        this.id = uuid();
        this.actorId = actor.id;
        this.actorType = actor.type;
        this.actorVersion = actor.version;
        this.date = new Date();
    }

    get json() {
        return Event.toJSON(this);
    }

    static toJSON(event: Event) {
        return this._toJSON(event);
    }

    private static _toJSON(data) {
        return JSON.parse(JSON.stringify(data));
    }

    static parse(data): Event {
        let event = this._toJSON(data);
        event.__proto__ = Event.prototype;
        return event;
    }

}
