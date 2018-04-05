"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Actor_1 = require("../Actor");
const datakey = Symbol.for("datakey");
const setdata = Symbol.for("setdata");
class IdManager extends Actor_1.default {
    constructor({ id }) {
        super({ id, ids: new Map() });
    }
    static toJSON(actor) {
        const data = actor[datakey];
        return { id: data.id, ids: Array.from(data.ids) };
    }
    static parse(json) {
        const actor = new this(json);
        actor[setdata].ids = new Map(json.ids);
        return actor;
    }
}
exports.default = IdManager;
//# sourceMappingURL=IDManager.js.map