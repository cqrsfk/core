"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const env_1 = require("./env");
const ob_1 = require("@cqrsfk/ob");
const ob_middle_change_1 = require("@cqrsfk/ob-middle-change");
const ob_middle_sync_1 = require("@cqrsfk/ob-middle-sync");
const ob_middle_1 = require("./ob-middle");
const Context_1 = require("./Context");
const Saga_1 = require("./Saga");
const eventAlias_1 = require("./eventAlias");
const events_1 = require("events");
const sleep_promise_1 = __importDefault(require("sleep-promise"));
const shortid_1 = __importDefault(require("shortid"));
const publish_1 = require("./publish");
const updater_1 = require("./updater");
if (!env_1.isBrowser) {
    var lockfile = require("proper-lockfile");
    var { writeFileSync, mkdirSync, readdirSync, readFileSync } = require("fs");
}
class Domain {
    constructor({ name, db }) {
        this.TypeMap = new Map();
        this.TypeDBMap = new Map();
        this.eventsBuffer = [];
        this.bus = new events_1.EventEmitter();
        this.isSync = false;
        this.localBus = new events_1.EventEmitter();
        this.publishing = false;
        this.actorBuffer = new Map();
        this.processInfo = {
            sagaIds: []
        };
        this.db = db;
        this.name = name;
        this.id = shortid_1.default();
        this.reg = this.reg.bind(this);
        this.create = this.create.bind(this);
        this.get = this.get.bind(this);
        this.localGet = this.localGet.bind(this);
        this.find = this.find.bind(this);
        this.findRows = this.findRows.bind(this);
        if (!env_1.isBrowser) {
            try {
                mkdirSync(name);
            }
            catch (err) { }
            // TODO:  find unlock lock's files  
            const locknames = readdirSync(name);
            for (let n of locknames) {
                if (!lockfile.checkSync(name + "/" + n)) {
                    lockfile.lockSync(name + "/" + n);
                    // handle unfinish sagas
                    const buf = readFileSync(name + "/" + n, "utf8");
                    const json = JSON.parse(buf);
                    const sagaIds = json.sagaIds;
                    for (let typeid of sagaIds) {
                        const [type, id] = typeid.split(".");
                        this.recoverSaga(type, id);
                    }
                }
            }
            writeFileSync(name + "/" + this.id, JSON.stringify(this.processInfo));
            lockfile.lockSync(name + "/" + this.id);
        }
        // this.changeHandle = this.changeHandle.bind(this);
        // db.changes({
        //   since: "now",
        //   live: true,
        //   include_docs: true
        // }).on("change", this.changeHandle);
        // writeFileSync(this.id,JSON.stringify());
    }
    async recoverSaga(type, id) {
        const saga = await this.get(type, id);
        if (saga) {
            await saga.recover();
        }
    }
    enableSync() {
        if (!this.isSync) {
            this.isSync = true;
            this.actorBuffer = new Map();
        }
    }
    disableSync() {
        if (this.isSync) {
            this.isSync = false;
        }
    }
    reg(Type, db) {
        this.TypeMap.set(Type.type, Type);
        if (!env_1.isBrowser) {
            if (Type.prototype instanceof Saga_1.Saga) {
                this.on({ actor: Type.type, type: "created" }, (event) => {
                    this.processInfo.sagaIds.push(event.actorType + "." + event.actorId);
                    writeFileSync(this.name + "/" + this.id, JSON.stringify(this.processInfo));
                });
                this.on({ actor: Type.type, type: "finish" }, (event) => {
                    const sagaIds = new Set(this.processInfo.sagaIds);
                    sagaIds.delete(event.actorType + "." + event.actorId);
                    this.processInfo.sagaIds = [...sagaIds];
                    writeFileSync(this.name + "/" + this.id, JSON.stringify(this.processInfo));
                });
            }
        }
        if (db) {
            this.TypeDBMap.set(Type.type, db);
            // db.changes({
            //   since: "now",
            //   live: true,
            //   include_docs: true
            // }).on("change", this.changeHandle);
        }
    }
    async create(type, argv, isSync) {
        const Type = this.TypeMap.get(type);
        if (Type) {
            Type.beforeCreate && (await Type.beforeCreate(argv));
            const actor = new Type(...argv);
            const proxy = (isSync || this.isSync) ? this.proxy(actor) : actor;
            this.actorBuffer.set(actor._id, proxy);
            const p = this.observe(proxy);
            await p.save(true);
            const e = {
                id: shortid_1.default(),
                type: "created",
                data: actor.json,
                actorId: actor._id,
                actorType: actor.$type,
                actorVersion: actor.$version,
                actorRev: actor._rev,
                createTime: Date.now()
            };
            publish_1.publish([e], this.localBus);
            return p;
        }
        else
            throw new Error(type + " type no exist ! ");
    }
    changeHandle({ doc, deleted }) {
        if (doc) {
            const { _rev, $type, $events, $version, _id } = doc;
            const pn = _rev.split("-")[0];
            if (pn === "1") {
                const createEvent = {
                    id: shortid_1.default(),
                    type: "created",
                    data: doc,
                    actorId: _id,
                    actorType: $type,
                    actorVersion: $version,
                    actorRev: _rev,
                    createTime: Date.now()
                };
                this.eventsBuffer.push(createEvent);
            }
            else if (deleted) {
                const deleteEvent = {
                    id: shortid_1.default(),
                    type: "deleted",
                    data: doc,
                    actorId: _id,
                    actorType: $type,
                    actorVersion: $version,
                    actorRev: _rev,
                    createTime: Date.now()
                };
                this.eventsBuffer.push(deleteEvent);
            }
            else {
                this.eventsBuffer.push(...$events);
            }
            this.publish();
        }
    }
    async publish() {
        if (this.publishing) {
            return;
        }
        this.publishing = true;
        const event = this.eventsBuffer.shift();
        if (event) {
            const eventNames = eventAlias_1.getAlias(event);
            eventNames.forEach(e => {
                this.bus.emit(e, event);
            });
            await sleep_promise_1.default(0);
            this.publishing = false;
            await this.publish();
        }
        else {
            this.publishing = false;
        }
    }
    addEventListener(event, listener, { local = false, once = false } = {
        local: false,
        once: false
    }) {
        let eventname;
        const bus = local ? this.localBus : this.bus;
        if (typeof event === "string")
            eventname = event;
        else
            eventname = this.getEventName(event);
        if (once)
            bus.once(eventname, listener);
        else
            bus.on(eventname, listener);
    }
    on(event, listener, local = true) {
        this.addEventListener(event, listener, { once: false, local });
    }
    once(event, listener, local = true) {
        this.addEventListener(event, listener, { once: true, local });
    }
    getEventName({ actor = "", type = "", id = "" }) {
        return `${actor}.${id}.${type}`;
    }
    removeListener(eventname, listener) {
        this.bus.removeListener(eventname, listener);
    }
    removeAllListeners(eventname) {
        this.bus.removeAllListeners(eventname);
    }
    /**
     * TODO:
     * @param actor
     * @param holderId
     */
    observe(actor, holderId, recoverEventId = "") {
        const ob = new ob_1.Observer(actor);
        const { proxy, use } = ob;
        const cxt = new Context_1.Context(this.TypeDBMap.get(actor.$type) || this.db, proxy, this);
        use(new ob_middle_1.OBMiddle(cxt, holderId, recoverEventId));
        return proxy;
    }
    async get(type, id, isSync) {
        return this.localGet(type, id, "", "", isSync);
    }
    async localGet(type, id, holderId, recoverEventId = "", isSync = false) {
        let proxy = this.actorBuffer.get(id);
        if (!proxy) {
            const actor = await this.nativeGet(type, id);
            if (actor) {
                proxy = (isSync || this.isSync) ? this.proxy(actor) : actor;
                this.actorBuffer.set(actor._id, proxy);
            }
            else {
                return null;
            }
        }
        return this.observe(proxy, holderId, recoverEventId);
    }
    proxy(actor) {
        const ob = new ob_1.Observer(actor, "cqrs");
        ob.use(ob_middle_change_1.Change);
        ob.use(ob_middle_sync_1.Sync);
        const proto = actor.clone();
        const unsubscribe = ob.proxy.$sync(updater_1.updater(proto, data => {
            const e = {
                id: shortid_1.default(),
                type: "$change",
                data,
                actorId: data._id,
                actorType: data.$type,
                actorVersion: data.$version,
                actorRev: data._rev,
                createTime: Date.now()
            };
            publish_1.publish([e], this.localBus);
        }));
        return ob.proxy;
    }
    async nativeGet(type, id) {
        // const doc = this.actorBuffer.get(id);
        // if (doc) return doc;
        const Type = this.TypeMap.get(type);
        if (Type) {
            const db = this.TypeDBMap.get(Type.type) || this.db;
            const row = await db.get(id);
            if (row) {
                const actor = Type.parse(row);
                return actor;
            }
            return null;
        }
        else
            throw new Error(type + " type no exist ! ");
    }
    async findRows(type, params) {
        const newParams = Object.assign(Object.assign({}, params), { selector: Object.assign(Object.assign({}, params.selector), { $type: type }) });
        const Type = this.TypeMap.get(type);
        if (Type) {
            const db = this.TypeDBMap.get(Type.type) || this.db;
            let fields;
            if (newParams.sort) {
                fields = newParams.sort.map(p => typeof p === "string" ? p : Object.keys(p)[0]);
            }
            fields && await db.createIndex({
                index: {
                    fields
                }
            });
            const { docs } = await db.find(newParams);
            return docs;
        }
        else
            throw new Error(type + " type no exist ! ");
    }
    async find(type, params) {
        const Type = this.TypeMap.get(type);
        if (Type) {
            const docs = await this.findRows(type, params);
            return docs.map(doc => {
                const actor = Type.parse(doc);
                return this.observe(actor);
            });
        }
        else
            throw new Error(type + " type no exist ! ");
    }
}
exports.Domain = Domain;
//# sourceMappingURL=Domain.js.map