export default class DefaultIdManager {
    private domainIdMap;
    private server;
    constructor(port: number | string);
    getAllIds(): Promise<number[]>;
    getDomainIds(actorId: any): Promise<number[]>;
}
