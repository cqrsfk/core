import Actor from "../Actor";
export default class IdManager extends Actor {
    constructor({id}: {
        id: any;
    });
    static toJSON(actor: Actor): any;
    static parse(json: any): Actor;
}
