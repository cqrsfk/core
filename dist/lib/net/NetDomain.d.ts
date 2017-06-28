interface NetDomain {
    has(actorId: any): boolean;
    create(type: string, data: any): Promise<any>;
    get(type: string, id: string): Promise<any>;
}
interface NetInfo {
}
