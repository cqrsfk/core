import DomainProxy from "./DomainProxy";
import Domain from "./Domain";
export default class DomainServer {
    private repos;
    constructor(domain: Domain, port: number, url: string, proxy?: DomainProxy);
}
