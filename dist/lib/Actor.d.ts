import LockDataType from "./types/LockDataType";
export default class Actor {
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
    remove(): void;
    lock(data: LockDataType): boolean;
    unlock(key: any): void;
    static toJSON(actor: Actor): any;
    static parse(json: any): Actor;
}
