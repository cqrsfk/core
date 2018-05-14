import Actor from "./Actor";
import Domain from "./Domain";

interface ActorConstructor {
    new(data:any): Actor;
    getType(): string;
    parse: (data:any) => Actor;
    toJSON: (Actor)=>any;
    beforeCreate?: (data:any, domain:Domain) => any;
    unique?:string[]
}

export default ActorConstructor;
