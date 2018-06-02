import Event from "./Event";
import Service from "./Service";
import LockDataType from "./LockDataType";
const uncommittedEvents = Symbol.for('uncommittedEvents');
const uuid = require('uuid').v1;
export const setdata = Symbol.for("setdata");
export const datakey = Symbol("datakey");
export const isLock = Symbol.for("isLock");
export const loadEvents = Symbol.for("loadEvents");
export const roleMap = Symbol.for("roleMap");
export const latestEventIndex  = Symbol.for("latestEventIndex");
import Domain from "./Domain";
import ActorConstructor from "./ActorConstructor";

export default class Actor {

    private latestLockTime: Date;
    private lockData = { key: null, timeout: 2000, latestLockTime: new Date(), isLock: false }

    // framework provider
    protected service: Service;
    protected $: Function;

    protected readonly data:any;

    constructor(data = {}) {
        this[uncommittedEvents] = [];
        this[datakey] = data;
        this[datakey].isAlive = true;
        this[datakey].listeners = {};
        if (!this[datakey].id) {
            this[datakey].id = uuid();
        }
        this[latestEventIndex] = -1;
    }

    get type(): string {
        return (<ActorConstructor>this.constructor).getType();
    }

    set [setdata](data) {
        this[datakey] = data;
    }

    get id() {
        return this.json.id;
    }

    static getType(): string {
        return this.name;
    }

    get json() {
        return (<ActorConstructor>this.constructor).toJSON(this);
    }

    get updater():any{
      throw new Error("please implements updater() Getter!");
    }

    subscribe(event:string,listenerType,listenerId:string,handleMethodName:string){
      this.$({event,listenerType,listenerId,handleMethodName});
    }

    unsubscribe(event:string,listenerId:string){
      this.$({event,listenerId});
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

    [loadEvents](events){
      events.forEach(event=>{
        let role = this.constructor[roleMap].get(event.roleName);
        let updater = this.updater[event.type] ||
                      this.updater[event.method+"Update"] ||
                      (role ? role.updater[event.type] || role.updater[event.method] : null);
        const updatedData = updater ? updater(this.json,event) : {};
        this[setdata] = Object.assign({}, this.json, updatedData );
        this[latestEventIndex] =  event.index;
      });
    }

    // todo
    unlock(key) {
        if (this.lockData.key === key) {
            this.lockData.key = null;
        }
    }

    static toJSON(actor: Actor) {
        return JSON.parse(JSON.stringify(actor[datakey]));
    }

    static parse(json) {
        let act = new this(json);
        act[datakey].id = json.id;
        return act;
    }

    unbind(){
      this.service.unbind();
    }

}
