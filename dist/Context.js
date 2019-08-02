"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uid = require("shortid");
const Saga_1 = require("./Saga");
class Context {
    constructor(db, actor, domain_) {
        this.db = db;
        this.actor = actor;
        this.domain_ = domain_;
        this.get = this.get.bind(this);
        this.apply = this.apply.bind(this);
        this.find = this.find.bind(this);
    }
    async get(type, id) {
        if (id === this.actor._id)
            return this.actor;
        return this.domain_.get(type, id, this.actor._id);
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
        const result = this.actor.$updater(event);
        this.actor.$events.push(event);
        return result;
    }
    async createSaga() {
        if (this.actor instanceof Saga_1.Saga) {
            throw new Error("saga instance can't createSaga.");
        }
        return await this.domain_.create("Saga", []);
    }
}
exports.Context = Context;
//# sourceMappingURL=Context.js.map