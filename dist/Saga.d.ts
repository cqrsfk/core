import { Actor } from "./Actor";
export declare class Saga extends Actor {
    finished: boolean;
    private actorInfo;
    constructor();
    lockGet<T extends Actor>(type: string, id: string): Promise<T | null>;
    addHandle({ data }: {
        data: any;
    }): void;
    end(): Promise<void>;
    recover(): Promise<void>;
}
