import { Actor } from "./Actor";
import EventBus from "./EventBus";
import EventType from "./EventType";
/**
 * When call actor's method , then DI service object.
 */
export default class Service {
    private actor;
    private bus;
    private getActor;
    private createActor;
    private method;
    private sagaId;
    private lockMode;
    private sagaMode;
    private key;
    constructor(actor: Actor, bus: EventBus, getActor: any, createActor: any, method: string, sagaId?: string);
    apply(type: string, data?: any): Promise<void>;
    lock(): void;
    unlock(): void;
    sagaBegin(): Promise<void>;
    sagaEnd(): Promise<void>;
    rollback(): Promise<void>;
    private actorLock(actor, timeout?);
    get(type: string, id: string): Promise<any>;
    create(type: string, data: any): Promise<any>;
    once(event: EventType, hande: string, timeout?: number): void;
    on(event: EventType, handle: string, timeout?: number): void;
}
