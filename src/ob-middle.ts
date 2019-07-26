import {
  Middleware,
  GetMiddle,
  AfterSetMiddle,
  BeforeApplyMiddle,
  AfterApplyMiddle
} from "@zalelion/ob/src/types/Middleware";
import { Observer } from "@zalelion/ob";
import { Context } from "./Context";
import { cloneDeep } from "lodash";

export class OBMiddle {
  private recording: boolean = false;
  private changes: any[] = [];
  private updaters: any[] = [];

  constructor(private ob: Observer<any>, private cxt: Context) {
    this.get = this.get.bind(this);
    // this.beforeSet = this.beforeSet.bind(this);
    // this.afterSet = this.afterSet.bind(this)
    this.$sync = this.$sync.bind(this);

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

  get({ root, path, parentPath, parent, key, value, ob }) {
    if (!parentPath && key === "$cxt") {
      return this.cxt;
    }
    if (root === parent && key === "$sync") {
      return this.$sync;
    }
    return value;
  }

  // beforeSet({
  //   newValue,key
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
  //   return newValue;
  // }

  // afterSet({
  //   newValue,
  //   newResult,
  //   key,root
  // }: {
  //   root: any;
  //   path: string;
  //   parentPath: string;
  //   parent: any;
  //   key: string;
  //   value: any;
  //   newValue: any;
  //   result:any,
  //   newResult:any,
  //   ob: Observer<any>;
  // }) {
  //   console.log("afterset",key,newValue,newResult);
  //   return true;
  // }

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
