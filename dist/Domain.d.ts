/// <reference types="pouchdb-find" />
/// <reference types="pouchdb-core" />
/// <reference types="pouchdb-mapreduce" />
/// <reference types="pouchdb-replication" />
import { Actor } from "./Actor";
export declare class Domain {
    private TypeMap;
    private TypeDBMap;
    private db;
    private eventsBuffer;
    private bus;
    private publishing;
    private actorBuffer;
    constructor({ db }: {
        db: PouchDB.Database;
    });
    reg<T extends typeof Actor>(Type: T, db?: PouchDB.Database): void;
    create<T extends Actor>(type: string, argv: any[]): Promise<T>;
    private changeHandle;
    publish(): Promise<void>;
    once(event: {
        actor?: string;
        type?: string;
        id?: string;
    } | string, listener: any): void;
    on(event: {
        actor?: string;
        type?: string;
        id?: string;
    } | string, listener: any, once?: boolean): void;
    getEventName({ actor, type, id }: {
        actor?: string;
        type?: string;
        id?: string;
    }): string;
    removeListener(eventname: any, listener: any): void;
    removeAllListeners(eventname?: string): void;
    private observe;
    get<T extends Actor>(type: string, id: string, holderId?: string): Promise<T>;
    private nativeGet;
    findRows(type: string, params: PouchDB.Find.FindRequest<{}>): Promise<any[]>;
    find<T extends Actor>(type: string, params: PouchDB.Find.FindRequest<{}>): Promise<T[]>;
}
