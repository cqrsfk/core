import LockDataType from "./types/LockDataType";
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
    new (any: any): Actor;
    getType(): string;
    createBefor?: (any, Domain) => Promise<any>;
    parse: (any) => Actor;
}
