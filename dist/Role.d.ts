import Actor from "./Actor";
export default class Role {
    readonly name: string;
    private supportedActorNames;
    readonly methods: any;
    readonly updater: any;
    constructor(name: string, supportedActorNames: string[], methods: any, updater?: any);
    wrap(actor: Actor | Array<any>): any[];
}
