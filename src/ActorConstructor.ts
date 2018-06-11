import Actor from "./Actor";
import Domain from "./Domain";

interface ActorConstructor {
    new(data:any): Actor;
    getType(): string;
    parse: (data:any) => Actor;
    toJSON: (Actor)=>any;
    created?:( actor:Actor, domain:Domain )=>void;
    beforeCreate?: (data:any, domain:Domain,uniqueValidatedOk:boolean,holded:string[]) => any;
    uniqueFields?:string[]
}

export default ActorConstructor;
