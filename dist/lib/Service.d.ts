import Actor from "./Actor";
import EventBus from "./EventBus";
import EventType from "./EventType";
import Role from "./Role";
import Repository from "./Repository";
import Domain from "./Domain";
export declare const latestEventIndex: unique symbol;
/**
 * When call actor's method , then DI service object.
 */
export default class Service {
    private actor;
    private bus;
    private repo;
    private _domain;
    private getActor;
    private createActor;
    private method;
    sagaId: string;
    private roleName;
    private role;
    private parents;
    private timeout;
    private lockMode;
    private sagaMode;
    private key;
    private subIds;
    applied: boolean;
    unbindCalled: boolean;
    constructor(actor: Actor, bus: EventBus, repo: Repository, _domain: Domain, getActor: any, createActor: any, method: string, sagaId?: string, roleName?: string, role?: Role, parents?: any[]);
    apply(type: string, data?: any, direct?: boolean): Promise<void>;
    lock(timeout?: number): void;
    unlock(): void;
    unbind(): void;
    sagaBegin(): void;
    sagaEnd(): void;
    rollback(): Promise<void>;
    private actorLock(actor);
    get(type: string, id: string): Promise<any>;
    create(type: string, data: any): Promise<any>;
    subscribe(event: EventType, handleMethodName: string): Promise<void>;
    unsubscribe(event: EventType): Promise<void>;
    getHistory(): Promise<any>;
}
