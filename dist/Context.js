"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uid = require("shortid");
class Context {
    constructor(db, actor, domain_) {
        this.db = db;
        this.actor = actor;
        this.domain_ = domain_;
        this.get = this.get.bind(this);
        this.apply = this.apply.bind(this);
        this.find = this.find.bind(this);
    }
    async get(id) {
        if (id === this.actor._id)
            return this.actor;
        return this.domain_.get(this.actor.$type, id);
    }
    async find(type, req) {
        if (arguments.length === 1) {
            return this.domain_.find(this.actor.$type, req);
        }
        else {
            return this.domain_.find(type, req);
        }
    }
    apply(type, data) {
        const event = {
            type,
            data,
            actorId: this.actor._id,
            actorType: this.actor.$type,
            actorVersion: this.actor.$version,
            id: uid(),
            actorRev: this.actor._rev,
            createTime: Date.now()
        };
        this.actor.$events.push(event);
        this.actor.$updater(event);
    }
}
exports.Context = Context;
//# sourceMappingURL=Context.js.map