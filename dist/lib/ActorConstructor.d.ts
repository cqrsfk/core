import Actor from "./Actor";
import Domain from "./Domain";
interface ActorConstructor {
    new (data: any): Actor;
    getType(): string;
    createBefor?: (data: any, domain: Domain) => any;
    parse: (data: any) => Actor;
    toJSON: (Actor) => any;
}
export default ActorConstructor;
