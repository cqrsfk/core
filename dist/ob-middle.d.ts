import { Observer } from "@zalelion/ob";
import { Context } from "./Context";
import "reflect-metadata";
export declare class OBMiddle {
    private ob;
    private cxt;
    private $sagaId?;
    private $recoverEventId;
    private recording;
    private changes;
    private updaters;
    constructor(ob: Observer<any>, cxt: Context, $sagaId?: string | undefined, $recoverEventId?: string);
    readonly watching: boolean;
    $sync(updater: any): any;
    $stopSync(updater?: any): void;
    get({ root, path, parentPath, parent, key, value, ob }: {
        root: any;
        path: any;
        parentPath: any;
        parent: any;
        key: any;
        value: any;
        ob: any;
    }): any;
    beforeApply(args: any, args2: any): any;
    afterApply({ parentPath, ob, key, newResult }: {
        root: any;
        path: string;
        parentPath: string;
        parent: any;
        fn: any;
        key: string;
        isNative: boolean;
        isArray: boolean;
        argv: any[];
        newArgv: any[];
        result: any;
        newResult: any;
        ob: Observer<any>;
    }): any;
}
