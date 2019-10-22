/// <reference types="pouchdb-core" />
import { Event } from "./types/Event";
import { Context } from "./Context";
import { History } from "./History";
import "reflect-metadata";
export declare class Actor {
    _id: string;
    _deleted: boolean;
    _rev?: string;
    $type: string;
    $events: Event[];
    $version: number;
    $listeners: any;
    $sagaId: string;
    $sync: any;
    $stopSync: any;
    $recoverEventId: string;
    $cxt: Context;
    constructor(...argv: any[]);
    static beforeCreate?(argv: any[]): void;
    static created?(actor: Actor): void;
    static readonly type: string;
    static version: number;
    static json(actor: any): any;
    static parse(json: any): any;
    readonly statics: typeof Actor;
    readonly json: any;
    clone(): any;
    beforeSave: any;
    afterSave: any;
    save(force?: boolean): Promise<PouchDB.Core.Response | void>;
    subscribe({ event, type, id, method }: {
        type: string;
        event: string;
        id: string;
        method: string;
    }): Promise<void | PouchDB.Core.Response>;
    unsubscribe({ event, type, id, method }: {
        type: string;
        event: string;
        id: string;
        method: string;
    }): Promise<void | PouchDB.Core.Response>;
    history(): Promise<History>;
    refresh(): Promise<void>;
    beforeRemove: any;
    afterRemove: any;
    private removed;
    remove(): Promise<PouchDB.Core.Response | undefined>;
    $updater(event: Event): any;
}
