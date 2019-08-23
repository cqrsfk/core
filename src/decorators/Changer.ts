import "reflect-metadata";

export function Changer(event: string) {
  return function(target: any, propertyKey: string) {
    let changers = Reflect.getMetadata("changers", target.constructor);
    if (!changers) {
      Reflect.defineMetadata("changers", (changers = {}), target.constructor);
    }

    changers[event] = propertyKey;
  };
  
}
