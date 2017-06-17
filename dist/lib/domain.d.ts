import { ActorConstructor } from "./Actor";
export default class Domain {
    private eventstore;
    private bus;
    private ActorClassMap;
    private repositorieMap;
    constructor();
    private getNativeActor(type, id);
    private nativeCreateActor(type, data);
    private getActorProxy(type, id, sagaId?);
    register(Classes: ActorConstructor[] | ActorConstructor): this;
    create(type: string, data: any): Promise<any>;
    get(type: string, id: string): Promise<any>;
}
