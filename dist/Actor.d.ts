/// <reference types="pouchdb-core" />
import { Event } from "./types/Event";
import { Context } from "./Context";
import { History } from "./History";
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
    static json(actor: any): any;
    static parse(json: any): any;
    readonly statics: typeof Actor;
    readonly json: any;
    $recover(sagaId: string, rev: string): Promise<PouchDB.Core.Response | undefined>;
    save(): Promise<PouchDB.Core.Response>;
    $lock(sagaId: string): Promise<PouchDB.Core.Response>;
    $unlock(sagaId: string): Promise<PouchDB.Core.Response>;
    history(): Promise<History>;
    sync(): Promise<void>;
    remove(): Promise<PouchDB.Core.Response | undefined>;
    $updater(event: Event): any;
}
