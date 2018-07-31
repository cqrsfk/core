'use strict';

const uuid = require('shortid');
const _ = require("lodash");

const updatedDataKey = Symbol();

export default class Event {
    readonly actorId: string
    readonly actorType: string
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
        public readonly roleName?: string
    ) {
        this[updatedDataKey] = null;

        this.id = uuid();
        this.actorId = actor.id;
        this.actorType = actor.type;
        this.date = new Date();
    }

    get json() {
        return Event.toJSON(this);
    }

    get updatedData(){
        return this[updatedDataKey];
    }

    set updatedData(v){
        if (this[updatedDataKey]) throw new Error("only set once.");
        this[updatedDataKey] = v;
    }

    static toJSON(event: Event) {
        return JSON.parse(JSON.stringify(event));
    }

    static parse(data): Event {
        let event = _.cloneDeep(data);
        let updatedData = event.updatedData;
        delete event.updatedData;
        event[updatedDataKey] = updatedData;
        event.__proto__ = Event.prototype;
        return event;
    }

}
