import * as io from "socket.io-client";
import DefaultClusterInfoManager from "./DefaultClusterInfoManager";
import { EventEmitter } from "events";
import Event from "./Event";
const uid = require("uuid").v1;

export default class DomainProxy extends EventEmitter {

    private domainInfos = new Map<string, any>();
    private sockets = {};

    constructor(private manager: DefaultClusterInfoManager) {
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

    async getActor(type, id): Promise<any> {

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
                            } else if (prop === "refresh") {
                                return new Promise(function () {
                                    socket.emit("getActor", type, id, function (_actorInfo) {
                                        actorInfo = _actorInfo;
                                        resolve(actorInfo);
                                    });
                                })
                            } else {
                                return new Proxy({}, {
                                    apply(target, cxt, args) {
                                        return new Promise(function () {
                                            socket.emit("call", type, id, prop, args, function (err, result) {
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

                    }));
                } else {
                    resolve(null);
                }
            })
        })
    }
}

