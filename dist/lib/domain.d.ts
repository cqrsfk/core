import { Actor, ActorConstructor } from "./Actor";
declare var domain: {
    register(Classes: ActorConstructor | ActorConstructor[]): any;
    create(type: string, data: any): Promise<any>;
    get(type: string, id: string): Promise<any>;
};
export default domain;
export { Actor };
