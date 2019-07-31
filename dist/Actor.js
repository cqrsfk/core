"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uid = require("shortid");
const lodash_1 = require("lodash");
const sleep = require("sleep-promise");
const History_1 = require("./History");
class Actor {
    constructor(...argv) {
        this._id = uid();
        this._deleted = false;
        this.$events = [];
        this.$type = this.statics.type;
        this.$version = this.statics.version;
    }
    static beforeCreate(argv) { }
    static created(actor) { }
    static get type() {
        return this.name;
    }
    static json(actor) {
        return JSON.parse(JSON.stringify(actor));
    }
    static parse(json) {
        json = lodash_1.cloneDeep(json);
        json.__proto__ = this.prototype;
        json.constructor = this;
        return json;
    }
    get statics() {
        return this.constructor;
    }
    get json() {
        return this.statics.json(this);
    }
    async $recover(sagaId, rev) {
        if (this.$lockSagaId && sagaId === this.$lockSagaId) {
            const doc = await this.$cxt.db.get(this._id, { rev });
            this.statics.lockFields.forEach(key => {
                this[key] = doc[key];
            });
            return await this.save();
        }
    }
    async save() {
        const json = this.json;
        const result = await this.$cxt.db.put(json);
        this._rev = result.rev;
        this.$events = [];
        await sleep(10);
        return result;
    }
    async $lock(sagaId) {
        if (this.$lockSagaId) {
            throw new Error("locked");
        }
        this.$lockSagaId = sagaId;
        return await this.save();
    }
    async $unlock(sagaId) {
        if (this.$lockSagaId === sagaId) {
            delete this.$lockSagaId;
            return this.save();
        }
        throw new Error("locked");
    }
    async history() {
        const row = await this.$cxt.db.get(this._id, {
            revs: true
        });
        let protoActor = this;
        const events = [];
        if (row._revisions) {
            let start = row._revisions.start;
            let ids = row._revisions.ids.reverse();
            for (let i = 0; i < start; i++) {
                const item = await this.$cxt.db.get(this._id, {
                    rev: i + 1 + "-" + ids[i]
                });
                events.push(...item.$events);
                if (i === 0)
                    protoActor = this.statics.parse(item);
            }
        }
        events.push(...this.$events);
        const history = new History_1.History(protoActor, events);
        return history;
    }
    async sync() {
        const latestJSON = await this.$cxt.db.get("mydoc");
        if (latestJSON._rev === this._rev)
            return;
        const latestActor = this.statics.parse(latestJSON);
        for (let k in latestActor) {
            if (latestActor.hasOwnProperty(k)) {
                this[k] = latestActor[k];
            }
        }
    }
    async remove() {
        if (this._rev) {
            const result = await this.$cxt.db.remove(this._id, this._rev);
            this._rev = result.rev;
            this._deleted = true;
            return result;
        }
    }
    $updater(event) {
        const method = event.type;
        if (this[method + "_"]) {
            const argv = Array.isArray(event.data) ? [...event.data] : [event.data];
            return this[method + "_"](...argv);
        }
    }
}
Actor.version = 1;
Actor.lockFields = [];
exports.Actor = Actor;
//# sourceMappingURL=Actor.js.map