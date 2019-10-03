/// <reference types="node" />
/// <reference types="pouchdb-find" />
/// <reference types="pouchdb-core" />
/// <reference types="pouchdb-mapreduce" />
/// <reference types="pouchdb-replication" />
import { Actor } from "./Actor";
import { EventEmitter } from "events";
export declare class Domain {
    private TypeMap;
    private TypeDBMap;
    private db;
    private eventsBuffer;
    private bus;
    localBus: EventEmitter;
    private publishing;
    readonly id: any;
    private readonly name;
    private actorBuffer;
    private processInfo;
    constructor({ name, db }: {
        name: string;
        db: PouchDB.Database;
    });
    private recoverSaga;
    reg<T extends typeof Actor>(Type: T, db?: PouchDB.Database): void;
    create<T extends Actor>(type: string, argv: any[]): Promise<T>;
    private changeHandle;
    publish(): Promise<void>;
    addEventListener(event: {
        actor?: string;
        type?: string;
        id?: string;
    } | string, listener: any, { local, once }?: {
        local: boolean;
        once: boolean;
    }): void;
    on(event: {
        actor?: string;
        type?: string;
        id?: string;
    } | string, listener: any, local?: boolean): void;
    once(event: {
        actor?: string;
        type?: string;
        id?: string;
    } | string, listener: any, local?: boolean): void;
    getEventName({ actor, type, id }: {
        actor?: string;
        type?: string;
        id?: string;
    }): string;
    removeListener(eventname: any, listener: any): void;
    removeAllListeners(eventname?: string): void;
    /**
     * TODO:
     * @param actor
     * @param holderId
     */
    private observe;
    get<T extends Actor>(type: string, id: string, holderId?: string, recoverEventId?: string): Promise<T | null>;
    private proxy;
    private nativeGet;
    findRows(type: string, params: PouchDB.Find.FindRequest<{}>): Promise<any[]>;
    find<T extends Actor>(type: string, params: PouchDB.Find.FindRequest<{}>): Promise<T[]>;
}
