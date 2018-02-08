import Event from "./Event";
import Service from "./Service";
import LockDataType from "./types/LockDataType";
const uncommittedEvents = Symbol.for('uncommittedEvents');
const loadEvents = Symbol.for('loadEvents');
const uuid = require('uuid').v1;
const setdata = Symbol.for("setdata");
const isLock = Symbol.for("isLock");
import Domain from "./Domain";

export class Actor {

    private data: any;
    private latestLockTime: Date;
    private lockData = { key: null, timeout: 2000, latestLockTime: new Date(), isLock: false }
    // framework provider
    protected service: any;
    protected $: any;

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

    getStore(){
      throw new Error("getStore() must implements.")
    }

    set [setdata](data) {
        this.data = data;
    }

    get id() {
        return this.json.id;
    }

    static getType(): string {
        return this.name;
    }

    get json() {
        let self:any = this;
        let data = self.constructor.toJSON(this);
        Object.freeze(data);
        return data;
    }

    get updater(){
      return {}
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

    remove(){
      this.$();
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

    static toJSON(actor: Actor) {
        return JSON.parse(JSON.stringify(actor.data));
    }

    static parse(json) {
        return new this(json);
    }
}

export interface ActorConstructor {
    new(data:any): Actor
    getType(): string
    createBefor?: (data:any, domain:Domain) => Promise<any>,
    parse: (data:any) => Actor
}
