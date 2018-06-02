import Actor from "./Actor";
export declare type arr = {
    key: string;
    value: string | number;
}[];
export default class UniqueValidator extends Actor {
    constructor({ actotType, uniqueFields }: {
        actotType: any;
        uniqueFields: any;
    });
    static getType(): string;
    private getArr;
    hasHold(key: string | arr, value?: string): boolean;
    hold(key: string | arr, value?: string): boolean;
    giveup(key: any, value: any): void;
    readonly updater: {
        hold(json: any, event: any): {
            repos: any;
        };
        giveup(json: any, event: any): {
            repos: any;
        };
    };
}
