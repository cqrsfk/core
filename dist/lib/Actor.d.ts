import Service from "./Service";
import LockDataType from "./LockDataType";
export declare const setdata: unique symbol;
export declare const datakey: unique symbol;
export declare const isLock: unique symbol;
export default class Actor {
    private latestLockTime;
    private lockData;
    protected service: Service;
    protected $: Function;
    constructor(data?: {});
    readonly type: string;
    [setdata]: any;
    readonly id: any;
    static getType(): string;
    readonly json: any;
    readonly updater: any;
    subscribe(event: string, listenerType: any, listenerId: string, handleMethodName: string): void;
    unsubscribe(event: string, listenerId: string): void;
    [isLock](key: any): boolean;
    remove(): void;
    lock(data: LockDataType): boolean;
    unlock(key: any): void;
    static toJSON(actor: Actor): any;
    static parse(json: any): Actor;
}
