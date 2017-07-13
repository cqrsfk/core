import Domain from "./Domain";
import DefaultCluterInfoManager from "./DefaultCluterInfoManager";
export default class DomainServer {
    constructor(domain: Domain, port: number, url: string, manager: DefaultCluterInfoManager);
}
