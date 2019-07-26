import { Middleware } from "./Middleware";
import { Observer } from "../Observer";

export interface MiddlewareConstructor {
  new (ob: Observer<any>): Middleware;
}
