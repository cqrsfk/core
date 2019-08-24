export interface Event {
    readonly type: string;
    readonly actorId: string;
    readonly actorType: string;
    readonly actorVersion: number;
    readonly id: string;
    readonly data: any;
    readonly createTime: number;
    readonly actorRev?: string;
    readonly sagaId?: string;
    readonly recoverEventId?: string;
}
