"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Actor_1 = require("./Actor");
class Saga extends Actor_1.Actor {
    constructor() {
        super();
        this.finished = false;
        this.actorInfo = {};
    }
    async lockGet(type, id) {
        const actor = await this.$cxt.get(type, id);
        if (!actor)
            return null;
        await actor.$lock(this._id);
        this.$cxt.apply("add", {
            [actor._id]: { type: actor.$type, rev: actor._rev }
        });
        await this.save();
        return actor;
    }
    addHandle({ data }) {
        this.actorInfo = Object.assign({}, this.actorInfo, data);
    }
    async end() {
        for (let aid in this.actorInfo) {
            let { type, rev } = this.actorInfo[aid];
            const actor = await this.$cxt.get(type, aid);
            await actor.$unlock(this._id);
        }
        this.finished = true;
        await this.save();
    }
    async recover() {
        if (!this.finished) {
            for (let aid in this.actorInfo) {
                let { type, rev } = this.actorInfo[aid];
                const actor = await this.$cxt.get(type, aid);
                await actor.$recover(this._id, rev);
            }
        }
    }
}
exports.Saga = Saga;
//# sourceMappingURL=Saga.js.map