/// <reference types="node" />
import DefaultClusterInfoManager from "./DefaultClusterInfoManager";
import { EventEmitter } from "events";
export default class DomainProxy extends EventEmitter {
    private manager;
    private domainInfos;
    private sockets;
    constructor(manager: DefaultClusterInfoManager);
    refreshDomainInfo(): Promise<void>;
    private createSocket(domainInfo);
    addSocket(domainId: any, socket: any): void;
    getActor(type: any, id: any): Promise<any>;
}
