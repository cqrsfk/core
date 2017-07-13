import Domain from "./Domain";
import * as io from "socket.io";
import * as cio from "socket.io-client";
import { EventEmitter } from "events";

const METHODS = [
    "getAllDomainInfo",
    "register",
    "logout",
    "deleteID",
    "getDomainIdById",
    "addId",
    "getIdMap"
];

export default class DefaultCluterInfoManager {

    private domainInfoMap = new Map<string, any>();
    private idMap = new Map<string, Set<string>>();
    private server;
    constructor(port: number | string) {

        if (typeof port === "string") {
            const socket = cio(port);
            return new Proxy(this, {
                get(target, prop: string) {
                    if (METHODS.includes(prop)) {
                        return new Proxy(function () { }, {
                            apply(target, cxt, args) {
                                return new Promise(function (resolve, reject) {
                                    socket.emit("call", prop, ...args, function (err, result) {
                                        if (err) reject(err);
                                        else {
                                            if (prop === "getIdMap") return resolve(new Map(result));
                                            resolve(result);
                                        };
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
                const result = await this[methodName](...args)
                if (methodName === "getIdMap") return callback(null,[...result])
                callback(null, result);
            })
        })

    }

    async getAllDomainInfo() {
        return [...this.domainInfoMap.values()]
    }

    async register(domainInfo) {
        this.domainInfoMap.set(domainInfo.id, domainInfo);
        this.idMap.set(domainInfo.id, new Set<string>());
    }

    async logout(domainId) {
        this.domainInfoMap.delete(domainId);
        this.idMap.delete(domainId);
    }

    async deleteID(id) {
        for (let [domainId, idset] of this.idMap) {
            idset.delete(id);
        }
    }

    async getDomainIdById(id) {
        for (let [domainId, idset] of this.idMap) {
            if (idset.has(id)) {
                return domainId;
            }
        }
    }

    async addId(domainId, id) {
        const did = await this.getDomainIdById(id);
        if (did) {
            throw { code: "EXIST", id, domainId: did }
        }
        const set = this.idMap.get(domainId);
        if (set) {
            set.add(id);
        }
    }

    async getIdMap() {
        return this.idMap;
    }


}