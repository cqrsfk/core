import { Context } from "./Context";
import "reflect-metadata";
export declare class OBMiddle {
    private cxt;
    private $sagaId?;
    private $recoverEventId;
    constructor(cxt: Context, $sagaId?: string | undefined, $recoverEventId?: string);
    get({ root, path, parentPath, parent, key, value, ob }: {
        root: any;
        path: any;
        parentPath: any;
        parent: any;
        key: any;
        value: any;
        ob: any;
    }): any;
}
