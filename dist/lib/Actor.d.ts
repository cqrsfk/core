import Event from "./Event";
import LockDataType from "./types/LockDataType";
export declare class Actor {
    private data;
    private latestLockTime;
    private service;
    constructor(data?: {});
    readonly type: string;
    readonly version: string;
    remove(args: any): void;
    readonly id: any;
    static getType(): string;
    readonly json: any;
    lock(data: LockDataType): boolean;
    unlock(key: any): void;
    relock(key: any): void;
    when(event: Event): any;
    static toJSON(actor: Actor): any;
    static parse(json: any): Actor;
    static readonly version: string;
}
export interface ActorConstructor {
    new (any: any): Actor;
    getType(): string;
    version: string;
    createBefor?: (any) => Promise<any>;
}
