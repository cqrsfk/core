interface NetDomain {
    has(actorId): boolean
    create(type: string, data: any): Promise<any>
    get(type: string, id: string): Promise<any>
    /**
     * create
     * get
     *  call
     */
}

// type DomainInfo = {
//     id: string,
//     ip: string,
//     port: number,
//     actorIds: string[]
// }

interface NetInfo {
    // otherDomainInfos: DomainInfo[]
}