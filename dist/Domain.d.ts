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
    private publishing;
    constructor({ db }: {
        db: PouchDB.Database;
    });
    reg<T extends typeof Actor>(Type: T, db?: PouchDB.Database): void;
    create<T extends Actor>(type: string, argv: any[]): Promise<T>;
    private changeHandle;
    publish(): Promise<void>;
    observe<T extends Actor>(actor: any): T;
    get<T extends Actor>(type: string, id: string): Promise<T>;
    findRows(type: string, params: PouchDB.Find.FindRequest<{}>): Promise<any[]>;
    find<T extends Actor>(type: string, params: PouchDB.Find.FindRequest<{}>): Promise<T[]>;
}
