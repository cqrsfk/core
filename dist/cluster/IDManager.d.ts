/// <reference types="socket.io-client" />
import Domain from '../Domain';
export declare class IDManager {
    private domain;
    private socket;
    private domainId;
    private holdIds;
    constructor(domain: Domain, socket: SocketIOClient.Socket);
    unbind(id: any): Promise<void>;
    isHold(id: any): boolean;
    bind(id: any): Promise<{}>;
}
