import Domain from "./Domain";
import DefaultClusterInfoManager from "./DefaultClusterInfoManager";
export default class DomainServer {
    constructor(domain: Domain, port: number, url: string, manager: DefaultClusterInfoManager);
}
