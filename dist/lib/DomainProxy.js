"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const io = require("socket.io-client");
const events_1 = require("events");
const uid = require("uuid").v1;
class DomainProxy extends events_1.EventEmitter {
    constructor(manager) {
        super();
        this.manager = manager;
        this.domainInfos = new Map();
        this.sockets = {};
        this.refreshDomainInfo().then(() => {
            this.emit("initialized");
        });
    }
    async refreshDomainInfo() {
        const infos = await this.manager.getAllDomainInfo();
        for (let info of infos) {
            this.domainInfos.set(info.id, info);
        }
    }
    async createSocket(domainInfo) {
        const that = this;
        return new Promise(function (resolve) {
            const socket = io(domainInfo.url);
            socket.on("connect", function () {
                that.sockets[domainInfo.id] = socket;
                resolve(socket);
            });
        });
    }
    addSocket(domainId, socket) {
        this.sockets[domainId] = socket;
    }
    async getActor(type, id) {
        const that = this;
        const domainId = await this.manager.getDomainIdById(id);
        let socket = this.sockets[domainId];
        if (!socket) {
            socket = await this.createSocket(this.domainInfos.get(domainId));
        }
        return new Promise(function (resolve, reject) {
            socket.emit("getActor", type, id, function (actorInfo) {
                if (actorInfo) {
                    resolve(new Proxy({}, {
                        get(target, prop) {
                            if (prop === "json") {
                                return actorInfo;
                            }
                            else if (prop === "refresh") {
                                return new Promise(function () {
                                    socket.emit("getActor", type, id, function (_actorInfo) {
                                        actorInfo = _actorInfo;
                                        resolve(actorInfo);
                                    });
                                });
                            }
                            else {
                                return new Proxy({}, {
                                    apply(target, cxt, args) {
                                        return new Promise(function () {
                                            socket.emit("call", type, id, prop, args, function (err, result) {
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