import "reflect-metadata";

export function Mutation(props: { validater?: Function; event: string }) {
  return function(target: any, propertyKey: string) {
    let mutations = Reflect.getMetadata("mutations", target.constructor);
    if (!mutations) {
      Reflect.defineMetadata("mutations", (mutations = {}), target.constructor);
    }

    mutations[propertyKey] = props;
  };
}
