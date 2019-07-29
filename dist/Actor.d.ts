/// <reference types="pouchdb-core" />
import { Event } from "./types/Event";
import { Context } from "./Context";
export declare class Actor {
    _id: string;
    _deleted: boolean;
    _rev?: string;
    $type: string;
    $version: number;
    $events: Event[];
    $lockSagaId: string;
    $sync: any;
    $syncReact: any;
    $cxt: Context;
    static version: number;
    static lockFields: string[];
    constructor(...argv: any[]);
    static beforeCreate?(argv: any[]): void;
    static created?(actor: Actor): void;
    static readonly type: string;
    static json<T extends Actor>(actor: T): any;
    static parse<T extends Actor>(json: any): T;
    readonly statics: typeof Actor;
    readonly json: any;
    $recover(sagaId: string, rev: string): Promise<PouchDB.Core.Response | undefined>;
    save(): Promise<PouchDB.Core.Response>;
    $lock(sagaId: string): Promise<PouchDB.Core.Response>;
    $unlock(sagaId: string): Promise<PouchDB.Core.Response>;
    sync(): Promise<void>;
    remove(): Promise<PouchDB.Core.Response | undefined>;
    $updater(event: Event): void;
}
