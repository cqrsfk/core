"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const env_1 = require("./env");
const ob_1 = require("@zalelion/ob");
const ob_middle_1 = require("./ob-middle");
const ob_middle_change_1 = require("@zalelion/ob-middle-change");
const Context_1 = require("./Context");
const Saga_1 = require("./Saga");
const eventAlias_1 = require("./eventAlias");
const events_1 = require("events");
const sleep = require("sleep-promise");
const uid = require("shortid");
const publish_1 = require("./publish");
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
        this.localBus = new events_1.EventEmitter();
        this.publishing = false;
        this.actorBuffer = new Map();
        this.processInfo = {
            sagaIds: []
        };
        this.db = db;
        this.name = name;
        this.id = uid();
        this.reg = this.reg.bind(this);
        this.create = this.create.bind(this);
        this.get = this.get.bind(this);
        this.find = this.find.bind(this);
        this.findRows = this.findRows.bind(this);
        if (!env_1.isBrowser) {
            try {
                mkdirSync(name);
            }
            catch (err) { }
            // find unlock lock's files
            const locknames = readdirSync(name);
            for (let n of locknames) {
                if (!lockfile.checkSync(name + "/" + n)) {
                    lockfile.lockSync(name + "/" + n);
                    // handle unfinish sagas
                    const buf = readFileSync(name + "/" + n, "utf8");
                    console.log(buf);
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
        await saga.recover();
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
    async create(type, argv) {
        const Type = this.TypeMap.get(type);
        if (Type) {
            Type.beforeCreate && (await Type.beforeCreate(argv));
            const actor = new Type(...argv);
            this.actorBuffer.set(actor._id, actor);
            const p = this.observe(actor);
            await p.save(true);
            const e = {
                id: uid(),
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
                    id: uid(),
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
                    id: uid(),
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
            await sleep(0);
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
     * TODO: FDSFDSFSFS
     * @param actor
     * @param holderId
     */
    observe(actor, holderId, recoverEventId = "") {
        const ob = new ob_1.Observer(actor);
        const { proxy, use } = ob;
        const cxt = new Context_1.Context(this.db, proxy, this);
        use(new ob_middle_change_1.Change(ob));
        use(new ob_middle_1.OBMiddle(ob, cxt, holderId, recoverEventId));
        return proxy;
    }
    async get(type, id, holderId, recoverEventId = "") {
        const actor = await this.nativeGet(type, id);
        return this.observe(actor, holderId, recoverEventId);
    }
    async nativeGet(type, id) {
        const doc = this.actorBuffer.get(id);
        if (doc)
            return doc;
        const Type = this.TypeMap.get(type);
        if (Type) {
            const db = this.TypeDBMap.get(Type.type) || this.db;
            const row = await db.get(id);
            if (row) {
                this.actorBuffer.set(id, row);
                const actor = Type.parse(row);
                return actor;
            }
            return null;
        }
        else
            throw new Error(type + " type no exist ! ");
    }
    async findRows(type, params) {
        const Type = this.TypeMap.get(type);
        if (Type) {
            const db = this.TypeDBMap.get(Type.type) || this.db;
            const { docs } = await db.find(params);
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