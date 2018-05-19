import ActorConstructor from "./ActorConstructor";
import Actor from "./Actor";
import Service from "./Service";
import { getAlias } from "./eventAlias";
import Event from "./Event";
import Repository from "./Repository";
import EventStore from "./DefaultEventStore";
import EventBus from "./EventBus";
const isLock = Symbol.for("isLock");
const debug = require('debug')('domain');
const uid = require("uuid").v1;
export const getActorProxy = Symbol.for("getActorProxy");

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
  private beforeCallHandles:any[] = [];
  public readonly id;

  constructor(options: any = {}) {
    this.id = uid();
    this.ActorClassMap = new Map();

    this.eventstore = options.eventstore || (options.EventStore ? new options.EventStore : new EventStore());
    this.repositorieMap = new Map();
    this.eventbus = options.EventBus ?
      new options.EventBus(this.eventstore, this, this.repositorieMap, this.ActorClassMap) :
      new EventBus(this.eventstore, this, this.repositorieMap, this.ActorClassMap);

    this.register(ActorEventEmitter).register(UniqueValidator);

  }

  // todo
  use(plugin): Domain {
    plugin({
      beforeCallHandles:this.beforeCallHandles
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
        if(ActorClass.uniqueFields){
          let arr = [];
          ActorClass.uniqueFields.forEach(key=>{
            let value;
            if(value = data[key] && ['string','number'].includes(typeof(value))){
              arr.push({key,value});
            }
          });
          if(arr.length){
            let uniqueValidator:UniqueValidator = await this.get('UniqueValidator',ActorClass.getType());
            if(!uniqueValidator){
              uniqueValidator = await this.create("UniqueValidator",{actotType:ActorClass.getType(), uniqueFields:ActorClass.uniqueFields});
            }
            uniqueValidatedOk = await uniqueValidator.hold(arr);
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

  async [getActorProxy](type: string, id: string, sagaId?: string, key?: string) {

    const that = this;

    let actor = await this.getNativeActor(type, id);

    if (!actor) {
        return null;
    }

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
        if (prop === "json" || prop === "id") {
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

                    for(let i=0;i<that.beforeCallHandles.length;i++){
                      await that.beforeCallHandles[i]({actor,prop});
                    }

                    const islock = actor[isLock](key);

                    if (islock) {
                      setTimeout(run, 2000);
                    } else {
                      const iservice = new Service(actor, that.eventbus, that.repositorieMap.get(that.ActorClassMap.get(actor.type)),
                        (type, id, sagaId, key) => that[getActorProxy](type, id, sagaId, key),
                        (type, data) => that.nativeCreateActor(type, data),
                        prop, sagaId, roleName, role);

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
                          resolve(result)
                        }).catch(err => {
                          that.eventbus.rollback(sagaId || iservice.sagaId).then(r => reject(err));
                        })
                      } else {
                        resolve(result);
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

  register(Classes: ActorConstructor[] | ActorConstructor ) {

    if (!Array.isArray(Classes)) {
      Classes = [Classes]
    }

    for (let Class of Classes) {
      const type = Class.getType();
      if (!type) throw new Error("please implements Actor.getType!");
      this.ActorClassMap.set(type, Class);
      const repo = new Repository(Class, this.eventstore, this.roleMap);
      this.repositorieMap.set(Class, repo);

      this.create("ActorEventEmitter", { id: "ActorEventEmitter" + type });

      repo.on("create", json => {
        let event = new Event(
          { id: json.id, type: Class.getType() }, json, "create", "create"
        )
        if(type !== 'ActorEventEmitter'){
          this.get('ActorEventEmitter','ActorEventEmitter'+event.actorType).then(emitter=>{
            emitter.publish(event);
          })
        }
        const alias = getAlias(event);
        for (let name of alias) {
          this.eventbus.emitter.emit(name, event);
        }
      });
    }

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

}
