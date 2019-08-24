"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Saga_1 = require("./Saga");
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
    async get(type, id, recoverEventId = "") {
        if (id === this.actor._id)
            return this.actor;
        return this.actor instanceof Saga_1.Saga
            ? this.domain_.get(type, id, this.actor._id, recoverEventId)
            : this.domain_.get(type, id);
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
        let event = {
            type,
            data,
            actorId: this.actor._id,
            actorType: this.actor.$type,
            actorVersion: this.actor.$version,
            id: uid(),
            actorRev: this.actor._rev,
            createTime: Date.now(),
            sagaId: this.actor.$sagaId,
            recoverEventId: this.actor.$recoverEventId
        };
        const result = this.actor.$updater(event);
        this.actor.$events.push(event);
        return result;
    }
    // subscribe(event: string, id: string, method: string){
    async subscribe({ event, type, id, method }) {
        const act = await this.domain_.get(type, id);
        if (act) {
            act.subscribe({
                event,
                type: this.actor.$type,
                id: this.actor._id,
                method
            });
        }
    }
    async unsubscribe({ type, id, event, method }) {
        const act = await this.domain_.get(type, id);
        if (act) {
            act.unsubscribe({
                event,
                type: this.actor.$type,
                id: this.actor._id,
                method
            });
        }
    }
}
exports.Context = Context;
//# sourceMappingURL=Context.js.map