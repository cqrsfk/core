/// <reference types="pouchdb-find" />
/// <reference types="pouchdb-core" />
/// <reference types="pouchdb-mapreduce" />
/// <reference types="pouchdb-replication" />
import { Actor } from "./Actor";
import { Domain } from "./Domain";
import { Saga } from "./Saga";
export declare class Context {
    db: PouchDB.Database;
    private actor;
    private domain_;
    constructor(db: PouchDB.Database, actor: Actor, domain_: Domain);
    get<T extends Actor>(type: string, id: string): Promise<Actor>;
    find(type: string, req: PouchDB.Find.FindRequest<{}>): any;
    find(req: PouchDB.Find.FindRequest<{}>): any;
    apply(type: string, data: any): any;
    createSaga(): Promise<Saga>;
}
