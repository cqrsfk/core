import "reflect-metadata";

export function Action(props?: { validater?: Function }) {
  return function(target: any, propertyKey: string) {
    let actions = Reflect.getMetadata("actions", target.constructor);
    if (!actions) {
      Reflect.defineMetadata("actions", (actions = {}), target.constructor);
    }

    actions[propertyKey] = props;
  };
}
