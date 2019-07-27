"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
class OBMiddle {
    constructor(ob, cxt, holderId) {
        this.ob = ob;
        this.cxt = cxt;
        this.holderId = holderId;
        this.recording = false;
        this.changes = [];
        this.updaters = [];
        this.get = this.get.bind(this);
        this.beforeApply = this.beforeApply.bind(this);
        this.afterApply = this.afterApply.bind(this);
        this.$sync = this.$sync.bind(this);
        ob.emitter.on("change", change => {
            if (this.recording) {
                this.changes.push(change);
            }
        });
    }
    $sync(updater) {
        this.updaters.push(updater);
        return lodash_1.cloneDeep(this.ob.root);
    }
    get({ root, path, parentPath, parent, key, value, ob }) {
        if (!parentPath && key === "$cxt") {
            return this.cxt;
        }
        if (root === parent && key === "$sync") {
            return this.$sync;
        }
        return value;
    }
    beforeSet({ newValue, key, root, path, parentPath }) {
        const actor = root;
        if (actor.$lockSagaId && this.holderId !== actor.$lockSagaId) {
            const fields = actor.statics.lockFields;
            if (fields.includes(key)) {
                throw new Error("locked!");
            }
        }
        return newValue;
    }
    beforeApply({ parentPath, key, newArgv }) {
        if (!parentPath && key === "$updater") {
            this.recording = true;
        }
        return newArgv;
    }
    afterApply({ parentPath, ob, key, newResult }) {
        if (!parentPath && key === "$updater") {
            this.recording = false;
            const changes = [...this.changes];
            this.changes = [];
            this.updaters.forEach(updater => {
                changes.forEach(change => updater(change));
            });
        }
        return newResult;
    }
}
exports.OBMiddle = OBMiddle;
//# sourceMappingURL=ob-middle.js.map