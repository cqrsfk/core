'use strict';

const uncommittedEvents = Symbol.for('uncommittedEvents');
const loadEvents = Symbol.for('loadEvents');
const AbstractActor = require('./AbstractActor');
const uuid = require('uuid').v1;
const $data = Symbol();

class Actor {

    constructor(data = {}) {
        this[uncommittedEvents] = [];
        this[$data] = data;
        this[$data].isAlive = true;
        if (!this[$data].id) {
            this[$data].id = uuid();
        }
    }

    get type() {
        return this.constructor.getType();
    }

    [loadEvents](events) {
        events.forEach(event => {
            this.when(event);
        });
    }

    remove(args, service) {
        service.apply('remove');
    }

    isAlive() {
    }

    get id() {
        return this.json.id;
    }

    static getType() {
        return this.name;
    }


    get json() {
        let data = this.constructor.toJSON(this);
        Object.freeze(data);
        return data;
    }

    [loadEvents](events) {
        events.forEach(event => {
            this.when(event, this[$data]);
        });
    }

    lock(data, service) {
        if (this.data.isLock) {
            throw new Error("locked");
        }
        service.apply("lock");
    }

    unlock(data, service) {
        service.apply("unlock");
    }

    when(event, data) {
        switch (event.type) {
            case 'remove':
                Object.assign({}, data, { isAlive: false });
                break;
            case 'lock':
                Object.assign({}, data, { isLock: true });
                break;
            case 'unlock':
                Object.assign({}, data, { isLock: false });
                break;
        }
    }

    isAlive() {
        return this[$data].isAlive;
    }

    get id() {
        return this[$data].id;
    }

    static toJSON(actor) {
        return JSON.parse(JSON.stringify(actor[$data]));
    }

    static parse(json) {
        return new this();
    }

    static getType() {
        return this.name;
    }

    static get version() {
        return "1.0";
    }
}

module.exports = Actor;