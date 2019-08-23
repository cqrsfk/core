import { Observer } from "@zalelion/ob";
import { Context } from "./Context";
import { cloneDeep, get } from "lodash";
import { Actor } from "./Actor";
import { reactStateSync } from "./utils/reactStateSync";
import "reflect-metadata";

export class OBMiddle {
  private recording: boolean = false;
  private changes: any[] = [];
  private updaters: any[] = [];

  constructor(
    private ob: Observer<any>,
    private cxt: Context,
    private $sagaId?: string,
    private $recoverEventId = ""
  ) {

    this.get = this.get.bind(this);
    this.beforeApply = this.beforeApply.bind(this);
    this.afterApply = this.afterApply.bind(this);
    this.$sync = this.$sync.bind(this);
    this.$stopSync = this.$stopSync.bind(this);

    ob.emitter.on("change", change => {
      if (this.recording) {
        this.changes.push(change);
      }
    });
  }

  get watching() {
    return !!this.updaters.length;
  }

  $sync(updater) {
    this.updaters.push(updater);
    return cloneDeep(this.ob.root);
  }

  $stopSync(updater?) {
    if (updater) {
      const set = new Set(this.updaters);
      set.delete(updater);
      this.updaters = [...set];
    } else {
      this.updaters = [];
    }
  }

  // $syncReact(vm, path) {
  //   this.updaters.push(function(change) {
  //     const ob = get(vm.state, path);
  //     const newOB = reactStateSync({ ...change, state: ob });

  //     const pathArr = path.split(".");
  //     const obKey = pathArr.pop();

  //     let sub, newState;
  //     for (let i = 0; i < pathArr.length; i++) {
  //       if (i === 0) {
  //         const v = ob[pathArr[0]];
  //         sub = { ...v };
  //         newState = { [pathArr[0]]: sub };
  //       } else {
  //         const key = pathArr[i];
  //         const v = sub[key];
  //         sub = sub[key] = { ...v };
  //       }
  //     }
  //     if (sub) {
  //       sub[obKey] = newOB;
  //     } else {
  //       newState = { [obKey]: newOB };
  //     }
  //     vm.setState(newState);
  //   });
  //   return cloneDeep(this.ob.root);
  // }

  get({ root, path, parentPath, parent, key, value, ob }) {
    const that = this;

    if (key === "constructor") {
      return parent.constructor;
    }

    if (!parentPath && key === "$cxt") {
      return this.cxt;
    }
    if (
      !parentPath &&
      (key === "$sync" ||
        key === "$stopSync" ||
        key === "$sagaId" ||
        key === "$recoverEventId")
    ) {
      return this[key];
    }

    if (!parentPath) {
      if (
        !this.recording &&
        value &&
        typeof value === "function"
        // funcs &&
        // funcs.includes(key)
      ) {
        // mutation
        const mutations =
          Reflect.getMetadata("mutations", root.constructor) || {};
        const mutation = mutations[key];
        if (mutation) {
          const { event, validater } = mutation;
          return function(...argv) {
            try {
              if (validater) validater(...argv);

              that.recording = true;

              that.cxt.apply(event, argv);
              const result = value.apply(this, argv);
              that.recording = false;

              if (this.watching) {
                const changes = [...that.changes];
                that.changes = [];
                that.updaters.forEach(updater => {
                  changes.forEach(change => updater(change));
                });
              }

              return result;
            } catch (err) {
              that.recording = false;
              throw err;
            }
          };
        }

        // action
        const actions = Reflect.getMetadata("actions", root.constructor) || {};
        const action = actions[key];
        if (action) {
          const { validater } = action;
          return function(...argv) {
            if (validater) validater(...argv);
            return value.apply(this, argv);
          };
        }

        return value;
      }
    }
    return value;
  }

  // beforeSet({
  //   newValue,
  //   key,
  //   root,
  //   path,
  //   parentPath
  // }: {
  //   root: any;
  //   path: string;
  //   parentPath: string;
  //   parent: any;
  //   key: string;
  //   value: any;
  //   newValue: any;
  //   ob: Observer<any>;
  // }) {
  //   const actor: Actor = root as Actor;
  //   if (actor.$lockSagaId && this.holderId !== actor.$lockSagaId) {
  //     const fields = actor.statics.lockFields;
  //     if (fields.includes(key)) {
  //       throw new Error("locked!");
  //     }
  //   }

  //   return newValue;
  // }

  beforeApply(args, args2) {
    let { parentPath, parent, key, argv, fn } = args2;

    if (!parentPath && this.watching && key === "$updater") {
      this.recording = true;
    }

    return args2;
  }

  afterApply({
    parentPath,
    ob,
    key,
    newResult
  }: {
    root: any;
    path: string;
    parentPath: string;
    parent: any;
    fn: any;
    key: string;
    isNative: boolean;
    isArray: boolean;
    argv: any[];
    newArgv: any[];
    result: any;
    newResult: any;
    ob: Observer<any>;
  }) {
    if (!parentPath && this.watching && key === "$updater") {
      this.recording = false;
      const changes = [...this.changes];
      this.changes = [];
      this.updaters.forEach(updater => {
        changes.forEach(change => updater(change));
      });
    }
    return newResult;
  }
}
