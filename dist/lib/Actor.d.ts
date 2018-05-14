import Service from "./Service";
import LockDataType from "./LockDataType";
export declare const setdata: symbol;
export declare const datakey: symbol;
export declare const isLock: symbol;
export default class Actor {
    private latestLockTime;
    private lockData;
    protected service: Service;
    protected $: Function;
    protected readonly data: any;
    constructor(data?: {});
    readonly type: string;
    readonly id: any;
    static getType(): string;
    readonly json: any;
    readonly updater: any;
    subscribe(event: string, listenerType: any, listenerId: string, handleMethodName: string): void;
    unsubscribe(event: string, listenerId: string): void;
    remove(): void;
    lock(data: LockDataType): boolean;
    unlock(key: any): void;
    static toJSON(actor: Actor): any;
    static parse(json: any): Actor;
}
