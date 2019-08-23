import "reflect-metadata";
export declare function Mutation(props: {
    validater?: Function;
    event: string;
}): (target: any, propertyKey: string) => void;
