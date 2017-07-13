export default class DefaultCluterInfoManager {
    private domainInfoMap;
    private idMap;
    server: any;
    constructor(port: number | string);
    getAllDomainInfo(): Promise<any>;
    register(domainInfo: any): Promise<void>;
    logout(domainId: any): Promise<void>;
    deleteID(id: any): Promise<void>;
    getDomainIdById(id: any): Promise<string>;
    addId(domainId: any, id: any): Promise<void>;
    getIdMap(): Promise<Map<string, Set<string>>>;
}
