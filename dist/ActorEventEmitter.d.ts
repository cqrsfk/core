import Actor from "./Actor";
import Event from "./Event";
export default class ActorEventEmitter extends Actor {
    constructor(data: any);
    static getType(): string;
    publish(event: Event): Promise<void>;
    subscribe(actorType: string, listenerType: string, listenerId: string, handleMethodName: string): void;
    unsubscribe(actorType: string, listenerId: string): void;
    readonly updater: {
        _subscribe(json: any, event: any): {
            [x: number]: any;
        };
        _unsubscribe(json: any, event: any): {
            [x: number]: any;
        };
    };
}
