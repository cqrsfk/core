import Event from "./Event";
import Service from "./Service";
import LockDataType from "./types/LockDataType";
const uncommittedEvents = Symbol.for('uncommittedEvents');
const loadEvents = Symbol.for('loadEvents');
const uuid = require('uuid').v1;
const setdata = Symbol.for("setdata");
const $when = Symbol.for("when");
const isLock = Symbol.for("isLock");
import Domain from "./Domain";

export class Actor {

    private data: any;
    private latestLockTime: Date;
    private lockData = { key: null, timeout: 2000, latestLockTime: new Date(), isLock: false }
    // framework provider 
    protected service: any;
    protected $: any;
    public tags = new Set<string>();

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
                return this.lockData.isLock && Date.now() - this.lockData.latestLockTime.getTime() < this.lockData.timeout;
            }
        } else {
            return false;
        }

    }

    lock(data: LockDataType) {
        if (this.lockData.key === data.key) {
            return true;
        }
        if (this.lockData.isLock && Date.now() - this.lockData.latestLockTime.getTime() < this.lockData.timeout) {
            return false
        } else {
            this.lockData.timeout = data.timeout || 200;
            this.lockData.key = data.key;
            this.lockData.isLock = true;
            this.lockData.latestLockTime = new Date();
            return true;
        }
    }

    // todo
    unlock(key) {
        if (this.lockData.key === key) {
            this.lockData.key = null;
        }
    }

    protected when(event: Event):any {
        switch (event.type) {
            case 'remove':
                return { isAlive: false };
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
    createBefor?: (any,Domain) => Promise<any>,
    parse: (any) => Actor
}