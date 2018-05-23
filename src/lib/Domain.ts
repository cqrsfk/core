import ActorConstructor from "./ActorConstructor";
import Actor from "./Actor";
import Service from "./Service";
import { getAlias } from "./eventAlias";
import Event from "./Event";
import Repository from "./Repository";
import EventStore from "./DefaultEventStore";
import EventBus from "./EventBus";
import { probe } from './cluster/utils';
import { IDManagerServer } from './cluster/IDManagerServer';
import { IDManager } from './cluster/IDManager';
import * as cio from "socket.io-client";
import MongoEventStore from 'cqrs-mongo-eventstore';

const isLock = Symbol.for("isLock");
const debug = require('debug')('domain');
const uid = require("uuid").v1;
export const roleMap = Symbol.for("roleMap");
export const getActorProxy = Symbol.for("getActorProxy");
export const latestEventIndex = Symbol.for("latestEventIndex");

const loadEvents = Symbol.for("loadEvents");

import UniqueValidator from './UniqueValidator';
import Role from "./Role";
import ActorEventEmitter from "./ActorEventEmitter";

export default class Domain {

  public eventstore: EventStore;
  public eventbus: EventBus;
  public ActorClassMap: Map<string, ActorConstructor>;
  public repositorieMap: Map<ActorConstructor, Repository>;
  private roleMap: Map<string, Role> = new Map();
  private setEventStore: Function;
  private beforeCallHandles: any[] = [];
  private idManager: IDManager;
  private _isCluster = false;
  private _isInited = false;
  private _waitInitList = [];
  private _isMaster = false;
  public readonly id;

  constructor(options: any = {}) {
    this.id = uid();

    let eventstore;

    // cluster support

    if (options.cluster) {
      this._isCluster = true;
      eventstore = new MongoEventStore('localhost/test');
      setImmediate(()=>probe(64321, bool => {
        if (bool) {
          new IDManagerServer();
          this._isMaster = true;
        }

        this._isInited = true;
        setImmediate(()=>this._waitInitList.forEach(fn => fn()));
        const socket = cio('http://localhost:64321');
        this.idManager = new IDManager(this, socket);
      }))

    }

    this.ActorClassMap = new Map();
    this.eventstore = eventstore || options.eventstore || (options.EventStore ? new options.EventStore : new EventStore());
    this.repositorieMap = new Map();
    this.eventbus = options.EventBus ?
      new options.EventBus(this.eventstore, this, this.repositorieMap, this.ActorClassMap) :
      new EventBus(this.eventstore, this, this.repositorieMap, this.ActorClassMap);

    this.register(ActorEventEmitter).register(UniqueValidator);

  }

  // TODO:
  waitInited() {
    return new Promise(resolve => {
      if (this._isInited) {
        resolve();
      } else {
        this._waitInitList.push(resolve);
      }
    })
  }

  get isCluster(): boolean {
    return this._isCluster;
  }

  // todo
  use(plugin): Domain {
    plugin({
      beforeCallHandles: this.beforeCallHandles
    });
    return this;
  }

  private async getNativeActor(type: string, id: string): Promise<any> {

    const roles = type.split(".");
    const actorType = roles.shift();

    let repo = this.repositorieMap.get(this.ActorClassMap.get(actorType));
    const actor = await repo.get(id);

    let result;

    if (roles.length) {
      for (let role of roles) {
        result = this.roleMap.get(role).wrap(result || actor);
      }
    }

    return result || actor;
  }

  private async nativeCreateActor(type, data) {

    const actorType = type.split(".").shift();

    const ActorClass = this.ActorClassMap.get(actorType);
    const repo = this.repositorieMap.get(ActorClass);


    if (ActorClass.beforeCreate) {


      try {
        let uniqueValidatedOk = true;

        //  unique field value validate
        if (ActorClass.uniqueFields) {
          let arr = [];
          ActorClass.uniqueFields.forEach(key => {
            let value;
            if (value = data[key] && ['string', 'number'].includes(typeof (value))) {
              arr.push({ key, value });
            }
          });
          if (arr.length) {
            let uniqueValidator: UniqueValidator = await this.get('UniqueValidator', ActorClass.getType());
            if (!uniqueValidator) {
              uniqueValidator = await this.create("UniqueValidator", { actotType: ActorClass.getType(), uniqueFields: ActorClass.uniqueFields });
            }
            uniqueValidatedOk = await uniqueValidator.hold(arr);
            uniqueValidator.unbind();
          }
        }
        data = (await ActorClass.beforeCreate(data, this, uniqueValidatedOk)) || data;
      } catch (err) {
        throw err;
      }
    }

    const actorId = (await repo.create(data)).json.id;
    const actor = await this[getActorProxy](type, actorId);
    return actor;

  }

  async [getActorProxy](type: string, id: string, sagaId?: string, key?: string, parents?: any[]) {

    parents = parents || [];

    let actor = await this.getNativeActor(type, id);
    if (!actor) {
      return null;
    }

    // cluster support

    if (this.isCluster) {
      if (!this.idManager.isHold(id)) {

        // if timeout , then try loop bind .
        let looptry = async () => {

          const result = await this.idManager.bind(id);

          if (result === 'timeout') { // timeout

            if (parents) {
              for (let parent of parents) {
                await this.idManager.unbind(parent.id); // unbind parent actor
                const p = await this[getActorProxy](parent.type, parent.id); // rebind parent actor

                // parent is removed
                if (!p) {
                  throw new Error(`type=${parent.type} id=${parent.id} 's actor is removed!`);
                }
              }
            }

            await looptry();

          }
        }

        await looptry();

        if (Array.isArray(actor)) {
          let events = await this.eventstore.findFollowEvents(actor[0].id, actor[latestEventIndex]);
          actor[0][loadEvents](events);
          if (!actor[0].json.isAlive) {
            return null;
          }
        } else {
          let events = await this.eventstore.findFollowEvents(actor.id, actor[latestEventIndex]);
          actor[loadEvents](events);
          if (!actor.json.isAlive) {
            return null;
          }
        }
      }
    }

    const that = this;

    let roles;
    if (Array.isArray(actor)) {
      roles = actor[1]
      actor = actor[0];
    }



    const proxy = new Proxy(actor, {
      get(target, prop: string) {

        if (prop === "then") { return proxy };

        if ("lock" === prop || "lockData" === prop) {
          return Reflect.get(target, prop);
        }

        let member = actor[prop];
        let roleName;
        let role;
        if (prop === "json" || prop === "id" || typeof prop === 'symbol') {
          return member;
        } else {
          if (!member) {
            if (roles) {
              for (let rn in roles) {
                role = roles[rn];
                member = role.methods[prop];
                roleName = rn;
                if (member) break;
              }
            } else return;
          }
          if (typeof member === "function") {
            if (prop in Object.prototype) return undefined;

            return new Proxy(member, {
              apply(target, cxt, args) {
                return new Promise(function(resolve, reject) {
                  async function run() {

                    for (let i = 0; i < that.beforeCallHandles.length; i++) {
                      await that.beforeCallHandles[i]({ actor, prop });
                    }

                    const islock = actor[isLock](key);

                    if (islock) {
                      setTimeout(run, 2000);
                    } else {
                      const iservice = new Service(actor, that.eventbus, that.repositorieMap.get(that.ActorClassMap.get(actor.type)),
                        that,
                        (type, id, sagaId, key, parent) => that[getActorProxy](type, id, sagaId, key, parent),
                        (type, data) => that.nativeCreateActor(type, data),
                        prop, sagaId, roleName, role, [...parents, { type: actor.type, id: actor.id }]);

                      const service = new Proxy(function service(type, data) {
                        if (arguments.length === 0) {
                          type = prop;
                          data = null;
                        } else if (arguments.length === 1) {
                          data = type;
                          type = prop;
                        }
                        return iservice.apply(type, data)
                      }, {
                          get(target, prop) {
                            return iservice[prop].bind(iservice);
                          }
                        })
                      cxt = { service, $: service };

                      cxt.__proto__ = proxy;
                      let result
                      try {
                        result = target.call(cxt, ...args);
                      } catch (err) {

                        that.eventbus.rollback(sagaId || iservice.sagaId).then(r => reject(err));
                        return;
                      }
                      if (result instanceof Promise) {
                        result.then(result => {
                          resolve(result);
                          if(!iservice.unbindCalled){
                            iservice.unbind();
                          }
                        }).catch(err => {
                          if(!iservice.unbindCalled){
                            iservice.unbind();
                          }
                          that.eventbus.rollback(sagaId || iservice.sagaId).then(r => reject(err));
                        })
                      } else {

                        resolve(result);
                        if(iservice.unbindCalled){
                          iservice.unbind();
                        }
                      }
                    }
                  }
                  run();
                });
              }
            });
          } else return undefined;
        }
      }
    })
    return proxy;
  }

  register(Classes: ActorConstructor[] | ActorConstructor) {

    if (!Array.isArray(Classes)) {
      Classes = [Classes]
    }

    (async () => {
      if (this.isCluster) {
        await this.waitInited();
      }
      for (let Class of Classes) {
        Class[roleMap] = this.roleMap;
        const type = Class.getType();
        if (!type) throw new Error("please implements Actor.getType!");
        this.ActorClassMap.set(type, Class);
        const repo = new Repository(Class, this.eventstore, this.roleMap);
        this.repositorieMap.set(Class, repo);

        (async ()=>{
          this.waitInited();
            if (type !== 'ActorEventEmitter' && type !== 'UniqueValidator'  ) {
              const emitter = await this.get('ActorEventEmitter', "ActorEventEmitter" + type);
              if (!emitter && (!this.isCluster || this._isMaster)) {
                this.create("ActorEventEmitter", { id: "ActorEventEmitter" + type });
              }
            }
            repo.on("create", json => {
              let event = new Event(
                { id: json.id, type: Class.getType() }, json, "create", "create"
              )
              if (type !== 'ActorEventEmitter') {
                this.get('ActorEventEmitter', 'ActorEventEmitter' + event.actorType).then(emitter => {
                  emitter.publish(event);
                })
              }
              const alias = getAlias(event);
              for (let name of alias) {
                this.eventbus.emitter.emit(name, event);
              }
            });
        })();


      }
    })();

    return this;
  }

  async create(type: string, data: any) {
    return await this.nativeCreateActor(type, data);
  }

  async get(type: string, id: string) {
    return await this[getActorProxy](type, id);
  }

  on(event, handle) {
    this.eventbus.on(event, handle);
  }

  once(event, handle) {
    this.eventbus.on(event, handle);
  }

  public getCacheActorIds() {
    let result = [];
    for (let [key, Actor] of this.ActorClassMap) {
      result = result.concat(this.repositorieMap.get(Actor).getCacheActorIds());
    }
    return result;
  }

  public addRole(name: string | any, supportedActorNames?: string[], methods?: any, updater?: any) {

    if (typeof name !== "string") {
      supportedActorNames = name.types;
      methods = name.methods;
      updater = name.updater;
      name = name.name;
    }

    if (this.roleMap.has(name)) throw new Error(name + " role is exist. ");
    this.roleMap.set(name, new Role(name, supportedActorNames, methods, updater));
    return this;
  }

  clearCache(id: string) {
    this.repositorieMap.forEach(repo => {
      repo.clear(id);
    })
  }

  unbind(id: string) {
    if(this._isCluster){
      this.idManager.unbind(id);
    }
  }

}
