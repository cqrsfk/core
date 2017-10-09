import { Actor } from "./Actor";
export default class Role {
    readonly name: string;
    private supportedActorNames;
    methods: any;
    constructor(name: string, supportedActorNames: string[], methods: any);
    wrap(actor: Actor | Array<any>): any[];
}
