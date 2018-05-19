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
    "getIdMap",
    "on"
];



export default class DefaultCluterInfoManager {

    private domainInfoMap = new Map<string, any>();
    private idMap = new Map<string, Set<string>>();
    public server;
    constructor(port: number | string) {

    }

    async getAllDomainInfo(): Promise<any> {
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
