/// <reference types="pouchdb-find" />
/// <reference types="pouchdb-core" />
/// <reference types="pouchdb-mapreduce" />
/// <reference types="pouchdb-replication" />
import { Actor } from "./Actor";
import { Saga } from "./Saga";
import { Domain } from "./Domain";
export declare class Context {
    db: PouchDB.Database;
    private actor;
    domain_: Domain;
    constructor(db: PouchDB.Database, actor: Actor | Saga, domain_: Domain);
    get<T extends Actor>(type: string, id: string, recoverEventId?: string): Promise<T | null>;
    find(type: string, req: PouchDB.Find.FindRequest<{}>): any;
    find(req: PouchDB.Find.FindRequest<{}>): any;
    apply(type: string, data: any): any;
    create<T extends Actor>(type: string, argv: any[]): Promise<T>;
    subscribe({ event, type, id, method }: {
        event: string;
        type: string;
        id: string;
        method: string;
    }): Promise<void>;
    unsubscribe({ type, id, event, method }: {
        type: string;
        id: string;
        event: string;
        method: string;
    }): Promise<void>;
}
