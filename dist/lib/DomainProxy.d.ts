/// <reference types="node" />
import DefaultClusterInfoManager from "./DefaultClusterInfoManager";
import { EventEmitter } from "events";
import ActorConstructor from "./ActorConstructor";
export default class DomainProxy extends EventEmitter {
    private manager;
    private ActorClassMap;
    private domainInfos;
    private sockets;
    constructor(manager: DefaultClusterInfoManager, ActorClassMap: Map<string, ActorConstructor>);
    refreshDomainInfo(): Promise<void>;
    private createSocket(domainInfo);
    addSocket(domainId: any, socket: any): void;
    getActor(type: any, id: any, sagaId?: any, key?: any): Promise<{}>;
}
