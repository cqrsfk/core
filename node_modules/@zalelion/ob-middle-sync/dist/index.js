"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// import { Middleware } from "../types/Middleware";
// import { Observer } from "../Observer";
const lodash_1 = require("lodash");
class Sync {
    constructor(ob) {
        this.ob = ob;
        this.updaters = [];
        ob.emitter.on("change", event => this.updaters.forEach(updater => updater(event)));
        this.$sync = this.$sync.bind(this);
        this.get = this.get.bind(this);
    }
    $sync(updater) {
        this.updaters.push(updater);
        return lodash_1.cloneDeep(this.ob.root);
    }
    get({ root, path, parent, key, value, ob }) {
        if (root === parent && key === "$sync") {
            return this.$sync;
        }
        return value;
    }
}
exports.Sync = Sync;
//# sourceMappingURL=index.js.map