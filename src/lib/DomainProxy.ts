import * as io from "socket.io-client";
import DefaultClusterInfoManager from "./DefaultClusterInfoManager";
import { EventEmitter } from "events";
import { ActorConstructor } from "./Actor";
import Event from "./Event";
import Domain from "./Domain";
const uid = require("uuid").v1;

export default class DomainProxy extends EventEmitter {

    private domainInfos = new Map<string, any>();
    private sockets = {};

    constructor(private manager: DefaultClusterInfoManager, private ActorClassMap: Map<string, ActorConstructor>) {
        super();
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

    private async createSocket(domainInfo) {
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

    async getActor(type, id, sagaId?, key?) {
        const that = this;
        const domainId = await this.manager.getDomainIdById(id);
        let socket = this.sockets[domainId];

        if (!socket) {
            let domainInfo = this.domainInfos.get(domainId) || ((await this.refreshDomainInfo()) || this.domainInfos.get(domainId));
            if (!domainInfo) {
                return null;
            }
            socket = await this.createSocket(domainInfo);
        }

        return new Promise(function (resolve, reject) {
            socket.emit("getActor", type, id, function (actorInfo) {
                if (actorInfo) {
                    const proxy = new Proxy(actorInfo, {
                        get(target, prop: string) {
                            if (prop === "json") {
                                return actorInfo;
                            } else if (prop === "refresh") {
                                return new Promise(function () {
                                    socket.emit("getActor", type, id, function (_actorInfo) {
                                        actorInfo = _actorInfo;
                                        resolve(actorInfo);
                                    });
                                })
                            } else {
                                if (!that.ActorClassMap.get(type).prototype[prop] || (prop in Object.prototype))
                                    return Reflect.get(target, prop);
                                return new Proxy(function () { }, {
                                    apply(target, cxt, args) {

                                        return new Promise(function () {
                                            socket.emit("call", type, id, sagaId, key, prop, args, function (err, result) {
                                                if (err) {
                                                    reject(err);
                                                } else {
                                                    resolve(result);
                                                }
                                            })
                                        })
                                    }
                                })
                            }
                        }

                    });
                    resolve(proxy);
                } else {
                    resolve(null);
                }
            })
        })
    }
}

