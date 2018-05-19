"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
class DefaultCluterInfoManager {
    constructor(port) {
        this.domainInfoMap = new Map();
        this.idMap = new Map();
    }
    async getAllDomainInfo() {
        return [...this.domainInfoMap.values()];
    }
    async register(domainInfo) {
        this.domainInfoMap.set(domainInfo.id, domainInfo);
        this.idMap.set(domainInfo.id, new Set());
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
            throw { code: "EXIST", id, domainId: did };
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
exports.default = DefaultCluterInfoManager;
//# sourceMappingURL=InfoManager.js.map