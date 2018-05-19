"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Service_1 = require("./Service");
const eventAlias_1 = require("./eventAlias");
const Event_1 = require("./Event");
const Repository_1 = require("./Repository");
const DefaultEventStore_1 = require("./DefaultEventStore");
const EventBus_1 = require("./EventBus");
const isLock = Symbol.for("isLock");
const debug = require('debug')('domain');
const uid = require("uuid").v1;
exports.getActorProxy = Symbol.for("getActorProxy");
const UniqueValidator_1 = require("./UniqueValidator");
const Role_1 = require("./Role");
const ActorEventEmitter_1 = require("./ActorEventEmitter");
class Domain {
    constructor(options = {}) {
        this.roleMap = new Map();
        this.beforeCallHandles = [];
        this.id = uid();
        this.ActorClassMap = new Map();
        this.eventstore = options.eventstore || (options.EventStore ? new options.EventStore : new DefaultEventStore_1.default());
        this.repositorieMap = new Map();
        this.eventbus = options.EventBus ?
            new options.EventBus(this.eventstore, this, this.repositorieMap, this.ActorClassMap) :
            new EventBus_1.default(this.eventstore, this, this.repositorieMap, this.ActorClassMap);
        this.register(ActorEventEmitter_1.default).register(UniqueValidator_1.default);
    }
    // todo
    use(plugin) {
        plugin({
            beforeCallHandles: this.beforeCallHandles
        });
        return this;
    }
    async getNativeActor(type, id) {
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
    async nativeCreateActor(type, data) {
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
                        let uniqueValidator = await this.get('UniqueValidator', ActorClass.getType());
                        if (!uniqueValidator) {
                            uniqueValidator = await this.create("UniqueValidator", { actotType: ActorClass.getType(), uniqueFields: ActorClass.uniqueFields });
                        }
                        uniqueValidatedOk = await uniqueValidator.hold(arr);
                    }
                }
                data = (await ActorClass.beforeCreate(data, this, uniqueValidatedOk)) || data;
            }
            catch (err) {
                throw err;
            }
        }
        const actorId = (await repo.create(data)).json.id;
        const actor = await this[exports.getActorProxy](type, actorId);
        return actor;
    }
    async [exports.getActorProxy](type, id, sagaId, key) {
        const that = this;
        let actor = await this.getNativeActor(type, id);
        if (!actor) {
            return null;
        }
        let roles;
        if (Array.isArray(actor)) {
            roles = actor[1];
            actor = actor[0];
        }
        const proxy = new Proxy(actor, {
            get(target, prop) {
                if (prop === "then") {
                    return proxy;
                }
                ;
                if ("lock" === prop || "lockData" === prop) {
                    return Reflect.get(target, prop);
                }
                let member = actor[prop];
                let roleName;
                let role;
                if (prop === "json" || prop === "id") {
                    return member;
                }
                else {
                    if (!member) {
                        if (roles) {
                            for (let rn in roles) {
                                role = roles[rn];
                                member = role.methods[prop];
                                roleName = rn;
                                if (member)
                                    break;
                            }
                        }
                        else
                            return;
                    }
                    if (typeof member === "function") {
                        if (prop in Object.prototype)
                            return undefined;
                        return new Proxy(member, {
                            apply(target, cxt, args) {
                                return new Promise(function (resolve, reject) {
                                    async function run() {
                                        for (let i = 0; i < that.beforeCallHandles.length; i++) {
                                            await that.beforeCallHandles[i]({ actor, prop });
                                        }
                                        const islock = actor[isLock](key);
                                        if (islock) {
                                            setTimeout(run, 2000);
                                        }
                                        else {
                                            const iservice = new Service_1.default(actor, that.eventbus, that.repositorieMap.get(that.ActorClassMap.get(actor.type)), (type, id, sagaId, key) => that[exports.getActorProxy](type, id, sagaId, key), (type, data) => that.nativeCreateActor(type, data), prop, sagaId, roleName, role);
                                            const service = new Proxy(function service(type, data) {
                                                if (arguments.length === 0) {
                                                    type = prop;
                                                    data = null;
                                                }
                                                else if (arguments.length === 1) {
                                                    data = type;
                                                    type = prop;
                                                }
                                                return iservice.apply(type, data);
                                            }, {
                                                get(target, prop) {
                                                    return iservice[prop].bind(iservice);
                                                }
                                            });
                                            cxt = { service, $: service };
                                            cxt.__proto__ = proxy;
                                            let result;
                                            try {
                                                result = target.call(cxt, ...args);
                                            }
                                            catch (err) {
                                                that.eventbus.rollback(sagaId || iservice.sagaId).then(r => reject(err));
                                                return;
                                            }
                                            if (result instanceof Promise) {
                                                result.then(result => {
                                                    resolve(result);
                                                }).catch(err => {
                                                    that.eventbus.rollback(sagaId || iservice.sagaId).then(r => reject(err));
                                                });
                                            }
                                            else {
                                                resolve(result);
                                            }
                                        }
                                    }
                                    run();
                                });
                            }
                        });
                    }
                    else
                        return undefined;
                }
            }
        });
        return proxy;
    }
    register(Classes) {
        if (!Array.isArray(Classes)) {
            Classes = [Classes];
        }
        for (let Class of Classes) {
            const type = Class.getType();
            if (!type)
                throw new Error("please implements Actor.getType!");
            this.ActorClassMap.set(type, Class);
            const repo = new Repository_1.default(Class, this.eventstore, this.roleMap);
            this.repositorieMap.set(Class, repo);
            this.create("ActorEventEmitter", { id: "ActorEventEmitter" + type });
            repo.on("create", json => {
                let event = new Event_1.default({ id: json.id, type: Class.getType() }, json, "create", "create");
                if (type !== 'ActorEventEmitter') {
                    this.get('ActorEventEmitter', 'ActorEventEmitter' + event.actorType).then(emitter => {
                        emitter.publish(event);
                    });
                }
                const alias = eventAlias_1.getAlias(event);
                for (let name of alias) {
                    this.eventbus.emitter.emit(name, event);
                }
            });
        }
        return this;
    }
    async create(type, data) {
        return await this.nativeCreateActor(type, data);
    }
    async get(type, id) {
        return await this[exports.getActorProxy](type, id);
    }
    on(event, handle) {
        this.eventbus.on(event, handle);
    }
    once(event, handle) {
        this.eventbus.on(event, handle);
    }
    getCacheActorIds() {
        let result = [];
        for (let [key, Actor] of this.ActorClassMap) {
            result = result.concat(this.repositorieMap.get(Actor).getCacheActorIds());
        }
        return result;
    }
    addRole(name, supportedActorNames, methods, updater) {
        if (typeof name !== "string") {
            supportedActorNames = name.types;
            methods = name.methods;
            updater = name.updater;
            name = name.name;
        }
        if (this.roleMap.has(name))
            throw new Error(name + " role is exist. ");
        this.roleMap.set(name, new Role_1.default(name, supportedActorNames, methods, updater));
        return this;
    }
}
exports.default = Domain;
//# sourceMappingURL=Domain.js.map