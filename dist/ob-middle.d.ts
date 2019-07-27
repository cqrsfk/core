import { Observer } from "@zalelion/ob";
import { Context } from "./Context";
export declare class OBMiddle {
    private ob;
    private cxt;
    private holderId?;
    private recording;
    private changes;
    private updaters;
    constructor(ob: Observer<any>, cxt: Context, holderId?: string | undefined);
    $sync(updater: any): any;
    get({ root, path, parentPath, parent, key, value, ob }: {
        root: any;
        path: any;
        parentPath: any;
        parent: any;
        key: any;
        value: any;
        ob: any;
    }): any;
    beforeSet({ newValue, key, root, path, parentPath }: {
        root: any;
        path: string;
        parentPath: string;
        parent: any;
        key: string;
        value: any;
        newValue: any;
        ob: Observer<any>;
    }): any;
    beforeApply({ parentPath, key, newArgv }: {
        root: any;
        path: string;
        parentPath: string;
        parent: any;
        fn: any;
        isNative: boolean;
        isArray: boolean;
        key: string;
        argv: any[];
        newArgv: any[];
        ob: Observer<any>;
    }): any[];
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
