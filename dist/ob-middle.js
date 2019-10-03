"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const uid = require("shortid");
const publish_1 = require("./publish");
class OBMiddle {
    constructor(cxt, $sagaId, $recoverEventId = "") {
        this.cxt = cxt;
        this.$sagaId = $sagaId;
        this.$recoverEventId = $recoverEventId;
        this.get = this.get.bind(this);
    }
    get({ root, path, parentPath, parent, key, value, ob }) {
        const that = this;
        if (key === "constructor") {
            return parent.constructor;
        }
        if (!parentPath && key === "$cxt") {
            return this.cxt;
        }
        if (!parentPath &&
            (key === "$sagaId" ||
                key === "$recoverEventId")) {
            return this[key];
        }
        if (!parentPath && key === "save") {
            return async function (force) {
                const events = [...this.$events];
                const result = await value.apply(this, [force]);
                publish_1.publish(events, that.cxt.domain_.localBus);
                return result;
            };
        }
        if (!parentPath) {
            if (value &&
                typeof value === "function") {
                // mutation
                const mutations = Reflect.getMetadata("mutations", root.constructor) || {};
                const mutation = mutations[key];
                if (mutation) {
                    const { event, validater } = mutation;
                    return function (...argv) {
                        if (validater)
                            validater(...argv);
                        const actor = root;
                        const myevent = {
                            type: event,
                            data: argv,
                            actorId: actor._id,
                            actorType: actor.$type,
                            actorVersion: actor.$version,
                            id: uid(),
                            actorRev: actor._rev,
                            createTime: Date.now(),
                            sagaId: this.$sagaId,
                            recoverEventId: this.$recoverEventId
                        };
                        actor.$events.push(myevent);
                        const result = value.apply(this, argv);
                        return result;
                    };
                }
                // action
                const actions = Reflect.getMetadata("actions", root.constructor) || {};
                const action = actions[key];
                if (action) {
                    const { validater } = action;
                    return function (...argv) {
                        if (validater)
                            validater(...argv);
                        return value.apply(this, argv);
                    };
                }
                return value;
            }
        }
        return value;
    }
}
exports.OBMiddle = OBMiddle;
//# sourceMappingURL=ob-middle.js.map