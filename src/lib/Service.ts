import Actor from "./Actor";
import EventBus from "./EventBus";
import EventType from "./EventType";
import Event from "./Event";
import Role from "./Role";
import Repository from "./Repository";
import ActorEventEmitter from "./ActorEventEmitter";
import Domain from "./Domain";
const uuid = require("uuid").v1;
const uncommittedEvents = Symbol.for("uncommittedEvents");
const setdata = Symbol.for("setdata");
export const latestEventIndex  = Symbol.for("latestEventIndex");

/**
 * When call actor's method , then DI service object.
 */
export default class Service {
  private timeout: number;
  private lockMode = false;
  private sagaMode = false;
  private key: string = uuid();
  private subIds : string[] = [];
  public applied: boolean = false;
  public unbindCalled: boolean = false;
  constructor(
    private actor: Actor,
    private bus: EventBus,
    private repo: Repository,
    private _domain:Domain,
    private getActor,
    private createActor,
    private method: string,
    public sagaId?: string,
    private roleName?: string,
    private role?: Role,
    private parents?: any[]
  ) {

  }

  async apply(type: string, data?: any, direct?: boolean) {
    const event = new Event(this.actor, data, type, this.method, this.sagaId, direct || false, this.roleName);

    let updater;
    if (type === "remove") {
      updater = () => ({ isAlive: false });
    } else if (type === "subscribe") {
      updater = (json, _event) => {
        const listeners = json.listeners;
        let { event, listenerType, listenerId, handleMethodName } = _event.data;
        if (listeners[event]) {
          listeners[event][listenerId] = { handleMethodName, listenerType };
        } else {
          listeners[event] = { [listenerId]: { handleMethodName, listenerType } }
        }
        return { listeners };
      }
    } else if (type === "unsubscribe") {
      updater = (json, _event) => {
        const listeners = json.listeners;
        let { event, listenerId } = _event.data;

        if (listeners[event]) {
          delete listeners[event][listenerId];
        }
        return { listeners };
      }
    } else {
      updater = (this.actor.updater[type] ||
        this.actor.updater[this.method + "Update"] ||
        (this.role ? this.role.updater[type] || this.role.updater[this.method] : null));
    }

    if (!updater) return;

    const updatedData = updater(this.actor.json, event);
    event.updatedData = updatedData;
    this.actor[setdata] = Object.assign({}, this.actor.json, direct ? data : {}, updatedData);
    this.actor[uncommittedEvents] = this.actor[uncommittedEvents] || [];
    this.actor[uncommittedEvents].push(event);
    ++this.actor[latestEventIndex];
    await this.bus.publish(this.actor);
    this.applied = true;

    if (!["subscribe", "unsubscribe", "_subscribe", "_unsubscribe"].includes(type)) {
      const actorType = this.actor.type;

      setImmediate(async ()=>{
        const emitter = await this.get("ActorEventEmitter", "ActorEventEmitter" + actorType);
        if(emitter){
          emitter.publish(event);
        }
      })

      let listeners = this.actor.json.listeners;
      let handles = listeners[type];

      let emit = async handles => {
        if (handles) {
          for (let id in handles) {
            let { handleMethodName, listenerType } = handles[id];

            let actor = await this.get(listenerType, id);

            if (actor) {
              actor[handleMethodName](event);
            }
          }
        }
      }
      emit(handles);
      handles = listeners["*"];
      emit(handles);

    }
    this.unbind();
  }

  lock(timeout?: number) {
    this.lockMode = true;
    this.timeout = timeout;
  }

  unlock() {
    this.lockMode = false;
    // todo
  }

  unbind(){
    this.unbindCalled = true;

    this._domain.unbind(this.actor.id);
    this.subIds.forEach(id=>this._domain.unbind(id));
  }

  sagaBegin() {
    if (this.sagaId && !this.sagaMode) {
      throw new Error("Cannot include child Saga");
    }
    this.sagaMode = true;
    this.sagaId = uuid();
  }

  sagaEnd() {
    if (this.sagaMode) {
      this.sagaMode = false;
      this.sagaId = null;
    }
  }

  async rollback() {
    if (this.sagaMode) {
      return await this.bus.rollback(this.sagaId);
    } else {
      throw new Error("no saga")
    }
  }

  private actorLock(actor): Promise<any> {

    const that = this;
    return new Promise((resolve, reject) => {

      tryLock();
      async function tryLock() {
        var isLock = await actor.lock({ key: that.key, timeout: that.timeout });
        if (isLock) resolve();
        else {
          setTimeout(tryLock, 300);
        }
      }

    });

  }

  async get(type: string, id: string) {
    if (id === this.actor.id) throw new Error("Don't be get self");
    this.subIds.push(id);
    let proxy = await this.getActor(type, id, this.sagaId || null, this.key , this.parents || []);
    if (!proxy) return null;

    if (this.lockMode) {
      await this.actorLock(proxy);
    }

    return proxy;

  }

  async create(type: string, data: any) {
    return this.createActor(...arguments, this.sagaId);
  }

  async subscribe(event: EventType, handleMethodName: string) {

    let { actorId, actorType, type } = event;
    if (actorId && actorType && type) {
      let actor = await this.get(actorType, actorId);
      if (actor) {
        (<Actor>actor).subscribe(type, this.actor.type, this.actor.id, handleMethodName);
      }
    } else if (actorType) {
      let actor = await this.get("ActorEventEmitter", "ActorEventEmitter" + actorType);
      if (actor) {
        await (<ActorEventEmitter>actor).subscribe(actorType, this.actor.type, this.actor.id, handleMethodName);
      }
    }
  }

  async unsubscribe(event: EventType) {
    let { actorId, actorType, type } = event;
    if (actorId && actorType && type) {
      let actor = await this.get(actorType, actorId);
      if (actor) {
        (<Actor>actor).unsubscribe(type, this.actor.id);
      }
    } else if (actorType) {
      let actor = await this.get("ActorEventEmitter", "ActorEventEmitter" + actorType);
      if (actor) {
        await (<ActorEventEmitter>actor).unsubscribe(actorType, this.actor.id);
      }
    }
  }

  async getHistory(): Promise<any> {
    return await this.repo.getHistory(this.actor.id);
  }

}
