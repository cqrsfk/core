'use strict';

const uid = require('uuid').v1;
const qs = require('querystring');

class Event {

    constructor(params) {

        this.actorId = params.actor.id;

        this.actorType = params.actor.type;

        this.actorVersion = this.constructor.version;

        this.id = uid();

        this.data = params.data;

        this.type = params.type;

        this.method = params.method;

        if (params.sagaId) {
            this.sagaId = params.sagaId || '';
            this.sage
        }

        this.date = Date.now();

        this.alias = [
            `${this.actorType}.${this.actorId}.${this.name}...`,
            `${this.actorType}..${this.name}...`,
            `.${this.actorId}.${this.name}...`,
            `.${this.actorId}....`
        ];

        if (this.sagaId) {
            this.alias.push(`...${this.sagaId}..${this.method}`)
        }

        Object.freeze(this);

    }

    get json() {
        return Event.toJSON(this);
    }

    static toJSON(event) {
        return JSON.parse(JSON.stringify(event));
    }

    static parse(json) {
        var event = Object.setPrototypeOf(json, this.prototype);
        Object.freeze(event);
        return event;
    }

}

module.exports = Event; 