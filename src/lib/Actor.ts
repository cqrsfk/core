import Event from "./Event";
import Service from "./Service";
import LockDataType from "./types/LockDataType";
const uncommittedEvents = Symbol.for('uncommittedEvents');
const loadEvents = Symbol.for('loadEvents');
const uuid = require('uuid').v1;
const setdata = Symbol.for("setdata");
const $when = Symbol.for("when");
const isLock = Symbol.for("isLock");
export class Actor {

    private data: any;
    private latestLockTime: Date;
    private lockData = { key: null, timeout: 2000, latestLockTime: new Date(), isLock: false }
    // framework provider 
    protected service: Service;

    constructor(data = {}) {
        this[uncommittedEvents] = [];
        this.data = data;
        this.data.isAlive = true;
        if (!this.data.id) {
            this.data.id = uuid();
        }
    }

    get type(): string {
        return this.constructor["getType"]();
    }

    get version() {
        return this.constructor["version"]
    }

    [loadEvents](events: Event[]) {
        let data;
        events.forEach(event => {
            data = this.when(event);
            if (!data) {
                data = this.data;
            }
        });
    }

    set [setdata](data) {
        this.data = data;
    }

    remove(args) {
        this.service.apply('remove');
    }

    get id() {
        return this.json.id;
    }

    static getType(): string {
        return this.name;
    }

    get json() {
        let data = Actor.toJSON(this);
        Object.freeze(data);
        return data;
    }

    [isLock](key) {
        if (this.lockData.key) {
            if (this.lockData.key === key) {
                return false;
            } else {
                console.log(Date.now() - this.lockData.latestLockTime.getTime() );
                return this.lockData.isLock && Date.now() - this.lockData.latestLockTime.getTime() < this.lockData.timeout
            }
        } else {
            return false;
        }

    }

    lock(data: LockDataType) {
        console.log("lock", this.type,this.id);
        if (this.lockData.key === data.key) {
            return true;
        }
        if (this.lockData.isLock && Date.now() - this.lockData.latestLockTime.getTime() < this.lockData.timeout) {
            return false
        } else {
            if (!this.lockData.timeout) {
                this.lockData.timeout = 2000
            }
            this.lockData.key = data.key;
            this.lockData.isLock = true;
            this.lockData.latestLockTime = new Date();
            return true;
        }
    }

    protected when(event: Event) {
        switch (event.type) {
            case 'remove':
                return Object.assign({}, this.data, { isAlive: false });
            default:
                return this.data;
        }
    }

    static toJSON(actor: Actor) {
        return JSON.parse(JSON.stringify(actor.data));
    }

    static parse(json) {
        return new this(json);
    }

    [$when](event) {
        return this.when(event);
    }

    static get version() {
        return "1.0";
    }
}

export interface ActorConstructor {
    new (any): Actor
    getType(): string
    version: string,
    createBefor?: (any) => Promise<any>,
    parse: (any) => Actor
}