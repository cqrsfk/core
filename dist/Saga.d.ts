import { Actor } from "./Actor";
import { Event } from "./types/Event";
export declare abstract class Saga extends Actor {
    private finish;
    private actorInfos;
    constructor();
    recover(): Promise<void>;
    abstract recoverHandle(events: Event[]): Promise<void>;
    begin(acts: Actor[]): Promise<void>;
    private setActorInfos;
    end(): Promise<void>;
    private setFinish;
}
