"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
const reactStateSync_1 = require("./utils/reactStateSync");
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
    $syncReact(vm, path) {
        this.updaters.push(function (change) {
            const ob = lodash_1.get(vm.state, path);
            const newOB = reactStateSync_1.reactStateSync(Object.assign({}, change, { state: ob }));
            const pathArr = path.split(".");
            const obKey = pathArr.pop();
            let sub, newState;
            for (let i = 0; i < pathArr.length; i++) {
                if (i === 0) {
                    const v = ob[pathArr[0]];
                    sub = Object.assign({}, v);
                    newState = { [pathArr[0]]: sub };
                }
                else {
                    const key = pathArr[i];
                    const v = sub[key];
                    sub = sub[key] = Object.assign({}, v);
                }
            }
            if (sub) {
                sub[obKey] = newOB;
            }
            else {
                newState[obKey] = newOB;
            }
            vm.setState(newState);
        });
        return lodash_1.cloneDeep(this.ob.root);
    }
    get({ root, path, parentPath, parent, key, value, ob }) {
        if (!parentPath && key === "$cxt") {
            return this.cxt;
        }
        if ((root === parent && key === "$sync") || key === "$syncReact") {
            return this[key];
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