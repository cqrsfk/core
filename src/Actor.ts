import Service from "./Service";
import LockDataType from "./LockDataType";
const uncommittedEvents = Symbol.for('uncommittedEvents');
const uuid = require('shortid');
const setdata = Symbol.for("setdata");
const datakey = Symbol.for("datakey");
const cloneDataKey = Symbol("cloneDataKey");
const isLock = Symbol.for("isLock");
const loadEvents = Symbol.for("loadEvents");
const roleMap = Symbol.for("roleMap");
const latestEventIndex  = Symbol.for("latestEventIndex");
const jsonKey = Symbol("json");
const _ = require("lodash");
import ActorConstructor from "./ActorConstructor";

export default class Actor {

    private latestLockTime: Date;
    private lockData = { key: null, timeout: 2000, latestLockTime: new Date(), isLock: false }

    public __proto__;
    public static toParse;
    // framework provider
    protected service: Service;
    protected $: Function;

    constructor(data = {}) {
        this[uncommittedEvents] = [];
        this[datakey] = data;
        this[datakey].isAlive = true;
        this[datakey].listeners = {};
        if (!this[datakey].id) {
            this[datakey].id = uuid();
        }
        this[latestEventIndex] = -1;
        this.refreshJSON();
    }

    get data(){
        return this[cloneDataKey];
    }

    refreshJSON(){
      return this[jsonKey] =  (<ActorConstructor>this.constructor).toJSON(this);
    }

    refreshData(){
      return Actor.toJSON(this);
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
      return this[jsonKey];
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
        const updatedData = updater ? updater(Actor.toJSON(this),event) : {};
        this[setdata] = Object.assign({}, Actor.toJSON(this), updatedData );
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
        return actor[cloneDataKey] = _.cloneDeep(actor[datakey]);
    }

    static parse(json) {
        let act = new Actor();
        if(this.toParse){
          json = this.toParse(json);
        }
        act[datakey] = json;
        act.__proto__ = this.prototype;
        return act;
    }

    unbind(){
      this.service.unbind();
    }

}
