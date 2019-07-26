export declare class Sync {
    private ob;
    private updaters;
    constructor(ob: any);
    $sync(updater: any): any;
    get({ root, path, parent, key, value, ob }: {
        root: any;
        path: any;
        parent: any;
        key: any;
        value: any;
        ob: any;
    }): any;
}
