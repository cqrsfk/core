"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Service_1 = require("./Service");
const eventAlias_1 = require("./eventAlias");
const Event_1 = require("./Event");
const Repository_1 = require("./Repository");
const DefaultEventStore_1 = require("./DefaultEventStore");
const EventBus_1 = require("./EventBus");
const utils_1 = require("./cluster/utils");
const IDManagerServer_1 = require("./cluster/IDManagerServer");
const IDManager_1 = require("./cluster/IDManager");
const cio = require("socket.io-client");
const cqrs_mongo_eventstore_1 = require("cqrs-mongo-eventstore");
const isLock = Symbol.for("isLock");
const debug = require('debug')('domain');
const uid = require("uuid").v1;
exports.roleMap = Symbol.for("roleMap");
exports.getActorProxy = Symbol.for("getActorProxy");
exports.latestEventIndex = Symbol.for("latestEventIndex");
const loadEvents = Symbol.for("loadEvents");
const UniqueValidator_1 = require("./UniqueValidator");
const Role_1 = require("./Role");
const ActorEventEmitter_1 = require("./ActorEventEmitter");
class Domain {
    constructor(options = {}) {
        this.roleMap = new Map();
        this.beforeCallHandles = [];
        this._isCluster = false;
        this._isInited = false;
        this._waitInitList = [];
        this._isMaster = false;
        this.id = uid();
        let eventstore;
        // cluster support
        if (options.cluster) {
            this._isCluster = true;
            eventstore = new cqrs_mongo_eventstore_1.default('localhost/test');
            setImmediate(() => utils_1.probe(64321, bool => {
                if (bool) {
                    new IDManagerServer_1.IDManagerServer();
                    this._isMaster = true;
                }
                this._isInited = true;
                setImmediate(() => this._waitInitList.forEach(fn => fn()));
                const socket = cio('http://localhost:64321');
                this.idManager = new IDManager_1.IDManager(this, socket);
            }));
        }
        this.ActorClassMap = new Map();
        this.eventstore = eventstore || options.eventstore || (options.EventStore ? new options.EventStore : new DefaultEventStore_1.default());
        this.repositorieMap = new Map();
        this.eventbus = options.EventBus ?
            new options.EventBus(this.eventstore, this, this.repositorieMap, this.ActorClassMap) :
            new EventBus_1.default(this.eventstore, this, this.repositorieMap, this.ActorClassMap);
        this.register(ActorEventEmitter_1.default).register(UniqueValidator_1.default);
    }
    // TODO:
    waitInited() {
        return new Promise(resolve => {
            if (this._isInited) {
                resolve();
            }
            else {
                this._waitInitList.push(resolve);
            }
        });
    }
    get isCluster() {
        return this._isCluster;
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
                        uniqueValidator.unbind();
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
    async [exports.getActorProxy](type, id, sagaId, key, parents) {
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
                                const p = await this[exports.getActorProxy](parent.type, parent.id); // rebind parent actor
                                // parent is removed
                                if (!p) {
                                    throw new Error(`type=${parent.type} id=${parent.id} 's actor is removed!`);
                                }
                            }
                        }
                        await looptry();
                    }
                };
                await looptry();
                if (Array.isArray(actor)) {
                    let events = await this.eventstore.findFollowEvents(actor[0].id, actor[exports.latestEventIndex]);
                    actor[0][loadEvents](events);
                    if (!actor[0].json.isAlive) {
                        return null;
                    }
                }
                else {
                    let events = await this.eventstore.findFollowEvents(actor.id, actor[exports.latestEventIndex]);
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
                if (prop === "json" || prop === "id" || typeof prop === 'symbol') {
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
                                            const iservice = new Service_1.default(actor, that.eventbus, that.repositorieMap.get(that.ActorClassMap.get(actor.type)), that, (type, id, sagaId, key, parent) => that[exports.getActorProxy](type, id, sagaId, key, parent), (type, data) => that.nativeCreateActor(type, data), prop, sagaId, roleName, role, [...parents, { type: actor.type, id: actor.id }]);
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
                                                    if (!iservice.unbindCalled) {
                                                        iservice.unbind();
                                                    }
                                                }).catch(err => {
                                                    if (!iservice.unbindCalled) {
                                                        iservice.unbind();
                                                    }
                                                    that.eventbus.rollback(sagaId || iservice.sagaId).then(r => reject(err));
                                                });
                                            }
                                            else {
                                                resolve(result);
                                                if (iservice.unbindCalled) {
                                                    iservice.unbind();
                                                }
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
        (async () => {
            if (this.isCluster) {
                await this.waitInited();
            }
            for (let Class of Classes) {
                Class[exports.roleMap] = this.roleMap;
                const type = Class.getType();
                if (!type)
                    throw new Error("please implements Actor.getType!");
                this.ActorClassMap.set(type, Class);
                const repo = new Repository_1.default(Class, this.eventstore, this.roleMap);
                this.repositorieMap.set(Class, repo);
                (async () => {
                    this.waitInited();
                    if (type !== 'ActorEventEmitter' && type !== 'UniqueValidator') {
                        const emitter = await this.get('ActorEventEmitter', "ActorEventEmitter" + type);
                        if (!emitter && (!this.isCluster || this._isMaster)) {
                            this.create("ActorEventEmitter", { id: "ActorEventEmitter" + type });
                        }
                    }
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
                })();
            }
        })();
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
    clearCache(id) {
        this.repositorieMap.forEach(repo => {
            repo.clear(id);
        });
    }
    unbind(id) {
        if (this._isCluster) {
            this.idManager.unbind(id);
        }
    }
}
exports.default = Domain;
//# sourceMappingURL=Domain.js.map