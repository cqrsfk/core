import Actor from "./Actor";
export declare const datakey: symbol;
export declare type arr = {
    key: string;
    value: string | number;
}[];
export default class UniqueValidator extends Actor {
    constructor({actotType, uniqueFields}: {
        actotType: any;
        uniqueFields: any;
    });
    private getArr(key, value?);
    hasVoid(key: string | arr, value?: string): boolean;
    private filter(arr);
    hold(key: string | arr, value?: string): boolean;
    readonly updater: {
        hold(json: any, event: any): {
            repos: any;
        };
    };
}
