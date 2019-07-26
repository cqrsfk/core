// import { Middleware } from "../types/Middleware";
// import { Observer } from "../Observer";
import { cloneDeep } from "lodash";
export class Sync {
  private updaters: any[] = [];
  constructor(private ob: any) {
    ob.emitter.on("change", event =>
      this.updaters.forEach(updater => updater(event))
    );
    this.$sync = this.$sync.bind(this);
    this.get = this.get.bind(this);
  }

  $sync(updater) {
    this.updaters.push(updater);
    return cloneDeep(this.ob.root);
  }

  get({ root, path, parent, key, value, ob }) {
    if (root === parent && key === "$sync") {
      return this.$sync;
    }
    return value;
  }
}
