/// <reference types="node" />
import { EventEmitter } from "events";
export default class DomainProxy extends EventEmitter {
    readonly entryURL: string;
    private entryDomainId;
    readonly domainId: string;
    private socket;
    private socketMap;
    private _connected;
    domainMap: Map<any, any>;
    private initialized;
    constructor(entryURL: string, entryDomainId: string, domainId: string);
    private connect(url);
    private init(socket);
    refresh(socket: any): Promise<{}>;
    getDomainInfoByActorId(actorId: any): any;
    addSocket(domainId: any, socket: any): void;
    has(actorId: any): boolean;
    readonly connected: boolean;
    getActor(type: any, id: any): Promise<{}>;
}
