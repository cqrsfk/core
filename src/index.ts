export {default as Domain} from "./Domain";
export {default as Actor} from "./Actor";
export {default as Event} from "./Event";
import Domain from "./Domain";
const cqrsVersionKey = Symbol.for("__cqrsVersionKey__");
if(global[cqrsVersionKey]){
  throw new Error("Warning! The CQRS module must be single!");
}

global[cqrsVersionKey] = true;
// default domain instance.
export const domain = new Domain();
