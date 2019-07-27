"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ob_1 = require("@zalelion/ob");
const ob_middle_1 = require("./ob-middle");
const ob_middle_change_1 = require("@zalelion/ob-middle-change");
const Context_1 = require("./Context");
const eventAlias_1 = require("./eventAlias");
const Saga_1 = require("./Saga");
const events_1 = require("events");
const sleep = require("sleep-promise");
class Domain {
    constructor({ db }) {
        this.TypeMap = new Map();
        this.TypeDBMap = new Map();
        this.eventsBuffer = [];
        this.bus = new events_1.EventEmitter();
        this.publishing = false;
        this.actorBuffer = new Map();
        this.db = db;
        this.reg = this.reg.bind(this);
        this.create = this.create.bind(this);
        this.get = this.get.bind(this);
        this.find = this.find.bind(this);
        this.findRows = this.findRows.bind(this);
        this.changeHandle = this.changeHandle.bind(this);
        db.changes({
            since: "now",
            live: true,
            include_docs: true
        }).on("change", this.changeHandle);
        this.reg(Saga_1.Saga, db);
    }
    reg(Type, db) {
        this.TypeMap.set(Type.type, Type);
        if (db) {
            this.TypeDBMap.set(Type.type, db);
            db.changes({
                since: "now",
                live: true,
                include_docs: true
            }).on("change", this.changeHandle);
        }
    }
    async create(type, argv) {
        const Type = this.TypeMap.get(type);
        if (Type) {
            Type.beforeCreate && (await Type.beforeCreate(argv));
            const actor = new Type(...argv);
            this.actorBuffer.set(actor._id, actor);
            const p = this.observe(actor);
            await p.save();
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
    once(event, listener) {
        this.on(event, listener, true);
    }
    on(event, listener, once = false) {
        let eventname;
        if (typeof event === "string")
            eventname = event;
        else
            eventname = this.getEventName(event);
        if (once)
            this.bus.once(eventname, listener);
        else
            this.bus.on(eventname, listener);
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
    observe(actor, holderId) {
        const ob = new ob_1.Observer(actor);
        const { proxy, use } = ob;
        const cxt = new Context_1.Context(this.db, proxy, this);
        use(new ob_middle_change_1.Change(ob));
        use(new ob_middle_1.OBMiddle(ob, cxt, holderId));
        return proxy;
    }
    async get(type, id, holderId) {
        const actor = await this.nativeGet(type, id);
        return this.observe(actor, holderId);
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