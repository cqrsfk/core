"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const immutability_helper_1 = __importDefault(require("immutability-helper"));
const lodash_1 = require("lodash");
function updater(obj, cb) {
    cb = lodash_1.throttle(cb);
    return function (changer) {
        const { isDelete, isFun, isSet, isMap, isArray, key, parentPath, argv, root, path, newValue } = changer;
        if (isArray) {
            switch (key) {
                case "push":
                    obj = immutability_helper_1.default(obj, lodash_1.set({}, parentPath, { $push: argv }));
                    break;
                case "unshift":
                    obj = immutability_helper_1.default(obj, lodash_1.set({}, parentPath, { $unshift: argv }));
                    break;
                case "shift":
                    obj = immutability_helper_1.default(obj, lodash_1.set({}, parentPath, { $splice: [[0, 1]] }));
                    break;
                case "pop":
                    const lastIndex = lodash_1.get(obj, parentPath).length - 1;
                    if (lastIndex >= 0) {
                        obj = immutability_helper_1.default(obj, lodash_1.set({}, parentPath, { $splice: [[lastIndex, 1]] }));
                    }
                    break;
                case "reverse":
                    const arr = lodash_1.get(obj, parentPath);
                    arr.reverse();
                    obj = immutability_helper_1.default(obj, lodash_1.set({}, parentPath, { $set: [...arr] }));
                    break;
                case "splice":
                    obj = immutability_helper_1.default(obj, lodash_1.set({}, parentPath, { $splice: [argv] }));
                    break;
            }
        }
        else if (isSet) {
            switch (key) {
                case "add":
                    obj = immutability_helper_1.default(obj, lodash_1.set({}, parentPath, { $add: argv }));
                    break;
                case "clear":
                    obj = immutability_helper_1.default(obj, lodash_1.set({}, parentPath, { $set: new Set }));
                    break;
                case "delete":
                    obj = immutability_helper_1.default(obj, lodash_1.set({}, parentPath, { $remove: argv }));
                    break;
            }
        }
        else if (isMap) {
            switch (key) {
                case "set":
                    obj = immutability_helper_1.default(obj, lodash_1.set({}, parentPath, { $add: [argv] }));
                    break;
                case "clear":
                    obj = immutability_helper_1.default(obj, lodash_1.set({}, parentPath, { $set: new Map }));
                    break;
                case "delete":
                    obj = immutability_helper_1.default(obj, lodash_1.set({}, parentPath, { $remove: argv }));
                    break;
            }
        }
        else if (isDelete) {
            const opt = parentPath ? lodash_1.set({}, parentPath, { $unset: [key] }) : { $unset: [key] };
            obj = immutability_helper_1.default(obj, opt);
        }
        else {
            obj = immutability_helper_1.default(obj, lodash_1.set({}, path, { $set: newValue }));
        }
        cb(obj);
    };
}
exports.updater = updater;
//# sourceMappingURL=updater.js.map