"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uid = require("shortid");
const lodash_1 = require("lodash");
const sleep = require("sleep-promise");
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
    async save() {
        const json = this.json;
        const result = await this.$cxt.db.put(json);
        this._rev = result.rev;
        this.$events = [];
        await sleep(10);
        return result;
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
        if (this[method + "Handle"]) {
            this[method + "Handle"](event);
        }
    }
}
Actor.version = 1;
exports.Actor = Actor;
//# sourceMappingURL=Actor.js.map