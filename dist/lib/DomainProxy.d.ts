/// <reference types="node" />
import { EventEmitter } from "events";
export default class DomainProxy extends EventEmitter {
    readonly url: any;
    private socket;
    private _id;
    private isURL;
    private _connected;
    private actorIds;
    private initialized;
    constructor(url: any);
    private init();
    refresh(): Promise<void>;
    has(actorId: any): boolean;
    readonly id: string;
    readonly connected: boolean;
    getActor(type: any, id: any): Promise<{}>;
}
