import LockDataType from "./types/LockDataType";
import Domain from "./Domain";
export declare class Actor {
    private data;
    private latestLockTime;
    private lockData;
    protected service: any;
    protected $: any;
    constructor(data?: {});
    readonly type: string;
    readonly version: any;
    getStore(): void;
    readonly id: any;
    static getType(): string;
    readonly json: any;
    readonly updater: {};
    lock(data: LockDataType): boolean;
    unlock(key: any): void;
    static toJSON(actor: Actor): any;
    static parse(json: any): Actor;
}
export interface ActorConstructor {
    new (data: any): Actor;
    getType(): string;
    createBefor?: (data: any, domain: Domain) => Promise<any>;
    parse: (data: any) => Actor;
}
