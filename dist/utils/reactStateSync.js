"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
function reactStateSync({ state, parentPath, key, value, isFun, argv }) {
    let part = {};
    let method = key;
    if (isFun) {
        const parentArr = parentPath.split(".");
        key = parentArr.pop();
        parentPath = parentArr.join(".");
    }
    if (parentPath) {
        const pathArr = parentPath.split(".");
        let sub;
        for (let i = 0; i < pathArr.length; i++) {
            if (i === 0) {
                const v = state[pathArr[0]];
                sub = Array.isArray(v) ? [...v] : Object.assign({}, v);
                part = { [pathArr[0]]: sub };
            }
            else {
                const key = pathArr[i];
                const v = sub[key];
                sub = sub[key] = Array.isArray(v) ? [...v] : Object.assign({}, v);
            }
        }
        if (isFun) {
            const pv = sub[key];
            let v;
            if (Array.isArray(pv)) {
                v = [...pv];
            }
            else {
                v = lodash_1.cloneDeep(pv);
            }
            v[method](...argv);
            sub[key] = v;
        }
        else {
            sub[key] = value;
        }
    }
    else {
        if (isFun) {
            const pv = state[key];
            let v;
            if (Array.isArray(pv)) {
                v = [...pv];
            }
            else {
                v = lodash_1.cloneDeep(pv);
            }
            v[method](...argv);
            part = { [key]: v };
        }
        else {
            part = { [key]: value };
        }
    }
    return part;
}
exports.reactStateSync = reactStateSync;
//# sourceMappingURL=reactStateSync.js.map