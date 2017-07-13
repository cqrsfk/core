/// <reference types="node" />
import DefaultCluterInfoManager from "./DefaultCluterInfoManager";
import { EventEmitter } from "events";
export default class DomainProxy extends EventEmitter {
    private manager;
    private domainInfos;
    private sockets;
    constructor(manager: DefaultCluterInfoManager);
    private init();
    private createSocket(domainInfo);
    addSocket(domainId: any, socket: any): void;
    getActor(type: any, id: any): Promise<{}>;
}
