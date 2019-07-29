// import {
//   Middleware,
//   GetMiddle,
//   AfterSetMiddle,
//   BeforeApplyMiddle,
//   AfterApplyMiddle
// } from "@zalelion/ob/src/types/Middleware";
import { Observer } from "@zalelion/ob";
import { Context } from "./Context";
import { cloneDeep, get } from "lodash";
import { Actor } from "./Actor";
import { reactStateSync } from "./utils/reactStateSync";

export class OBMiddle {
  private recording: boolean = false;
  private changes: any[] = [];
  private updaters: any[] = [];

  constructor(
    private ob: Observer<any>,
    private cxt: Context,
    private holderId?: string
  ) {
    this.get = this.get.bind(this);
    this.beforeApply = this.beforeApply.bind(this);
    this.afterApply = this.afterApply.bind(this);
    this.$sync = this.$sync.bind(this);
    this.$syncReact = this.$syncReact.bind(this);

    ob.emitter.on("change", change => {
      if (this.recording) {
        this.changes.push(change);
      }
    });
  }

  $sync(updater) {
    this.updaters.push(updater);
    return cloneDeep(this.ob.root);
  }

  $syncReact(vm, path) {
    this.updaters.push(function(change) {
      const ob = get(vm.state, path);
      const newOB = reactStateSync({ ...change, state: ob });

      const pathArr = path.split(".");
      const obKey = pathArr.pop();

      let sub, newState;
      for (let i = 0; i < pathArr.length; i++) {
        if (i === 0) {
          const v = ob[pathArr[0]];
          sub = { ...v };
          newState = { [pathArr[0]]: sub };
        } else {
          const key = pathArr[i];
          const v = sub[key];
          sub = sub[key] = { ...v };
        }
      }
      if (sub) {
        sub[obKey] = newOB;
      } else {
        newState = { [obKey]: newOB };
      }
      vm.setState(newState);
    });
    return cloneDeep(this.ob.root);
  }

  get({ root, path, parentPath, parent, key, value, ob }) {
    if (!parentPath && key === "$cxt") {
      return this.cxt;
    }
    if ((root === parent && key === "$sync") || key === "$syncReact") {
      return this[key];
    }
    return value;
  }

  beforeSet({
    newValue,
    key,
    root,
    path,
    parentPath
  }: {
    root: any;
    path: string;
    parentPath: string;
    parent: any;
    key: string;
    value: any;
    newValue: any;
    ob: Observer<any>;
  }) {
    const actor: Actor = root as Actor;
    if (actor.$lockSagaId && this.holderId !== actor.$lockSagaId) {
      const fields = actor.statics.lockFields;
      if (fields.includes(key)) {
        throw new Error("locked!");
      }
    }

    return newValue;
  }

  beforeApply({
    parentPath,
    key,
    newArgv
  }: {
    root: any;
    path: string;
    parentPath: string;
    parent: any;
    fn: any;
    isNative: boolean;
    isArray: boolean;
    key: string;
    argv: any[];
    newArgv: any[];
    ob: Observer<any>;
  }) {
    if (!parentPath && key === "$updater") {
      this.recording = true;
    }
    return newArgv;
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
    if (!parentPath && key === "$updater") {
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
