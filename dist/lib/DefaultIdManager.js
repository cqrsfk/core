"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const io = require("socket.io");
const cio = require("socket.io-client");
const METHODS = [
    "getAllIds",
    "getDomainIds"
];
class DefaultIdManager {
    constructor(port) {
        this.domainIdMap = new Map();
        if (typeof port === "string") {
            const socket = cio(port);
            return new Proxy(this, {
                get(target, prop) {
                    if (METHODS.includes(prop)) {
                        return new Proxy(function () { }, {
                            apply(target, cxt, args) {
                                return new Promise(function (resolve, reject) {
                                    socket.emit("call", prop, ...args, function (err, result) {
                                        if (err)
                                            reject(err);
                                        else
                                            resolve(result);
                                    });
                                });
                            }
                        });
                    }
                }
            });
        }
        this.server = io();
        this.server.listen(port);
        this.server.on("connection", socket => {
            socket.on("call", async (...args) => {
                const callback = args.pop();
                const methodName = args.shift();
                callback(null, (await this[methodName](...args)));
            });
        });
    }
    async getAllIds() {
        return [11, 22, 33];
    }
    async getDomainIds(actorId) {
        return [44, 555];
    }
}
exports.default = DefaultIdManager;
//# sourceMappingURL=DefaultIdManager.js.map