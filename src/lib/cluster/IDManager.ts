import Actor from "../Actor";
const datakey = Symbol.for("datakey");
const setdata = Symbol.for("setdata");

export default class IdManager extends Actor {

  constructor({ id }) {
    super({ id , ids: new Map<string,string>()});
  }

  static toJSON(actor: Actor):any {
      const data = actor[datakey];
      return {id:data.id, ids:Array.from(data.ids)};
  }

  static parse(json):Actor {
      const actor = new this(json);
      actor[setdata].ids = new Map(json.ids);
      return actor;
  }

}
