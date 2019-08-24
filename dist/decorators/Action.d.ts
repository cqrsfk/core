import "reflect-metadata";
export declare function Action(props?: {
    validater?: Function;
}): (target: any, propertyKey: string) => void;
