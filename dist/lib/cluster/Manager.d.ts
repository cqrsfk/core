/**
思考：
1、分布式 actor 如何操作 ， 锁定？
2、多地 actor 是否可行？
   event 顺序
*/
export default class Manager {
    constructor();
    register(actorId: string): Promise<void>;
    unregister(actorId: string): Promise<void>;
    getActor(actorId: string): Promise<void>;
}
