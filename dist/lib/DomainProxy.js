"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const io = require("socket.io-client");
const events_1 = require("events");
const uid = require("uuid").v1;
class DomainProxy extends events_1.EventEmitter {
    constructor(url) {
        super();
        this.url = url;
        this.initialized = false;
        const that = this;
        this._id = uid();
        this.isURL = typeof url === "string";
        this.socket = this.isURL ? io(url) : url;
        if (this.isURL) {
            this.socket.on("connect", () => {
                console.log("ccccconet");
                this._connected = true;
                this.emit("connected");
            });
            this.socket.on("connect_error", function () {
                console.log(arguments);
            });
        }
        else {
            this._connected = true;
        }
        this.socket.on("remove", function (actorId) {
            that.actorIds.delete(actorId);
        });
        this.socket.on("add", function (actorId) {
            that.actorIds.add(actorId);
        });
    }
    init() {
        this.socket.emit("getActorIds", (actorIds) => {
            this.actorIds = new Set(actorIds);
            this.initialized = true;
            this.emit("initialized");
        });
    }
    async refresh() {
        new Promise(function (resolve, reject) {
            this.socket.emit("getActorIds", (actorIds) => {
                this.actorIds = new Set(actorIds);
                resolve();
            });
        });
    }
    has(actorId) {
        return this.actorIds.has(actorId);
    }
    get id() {
        return this._id;
    }
    get connected() {
        return this._connected;
    }
    async getActor(type, id) {
        const that = this;
        return new Promise(function (resolve, reject) {
            that.socket.emit("getActor", type, id, function (actorInfo) {
                if (actorInfo) {
                    resolve(new Proxy(null, {
                        get(target, prop) {
                            if (prop === "json") {
                                return actorInfo;
                            }
                            else if (prop === "refresh") {
                                return new Promise(function () {
                                    that.socket.emit("getActor", type, id, function (_actorInfo) {
                                        actorInfo = _actorInfo;
                                        resolve(actorInfo);
                                    });
                                });
                            }
                            else {
                                return new Proxy(null, {
                                    apply(target, cxt, args) {
                                        return new Promise(function () {
                                            that.socket.emit("call", type, id, prop, args, function (err, result) {
                                                if (err) {
                                                    reject(err);
                                                }
                                                else {
                                                    resolve(result);
                                                }
                                            });
                                        });
                                    }
                                });
                            }
                        }
                    }));
                }
                else {
                    resolve(null);
                }
            });
        });
    }
}
exports.default = DomainProxy;
//# sourceMappingURL=DomainProxy.js.map