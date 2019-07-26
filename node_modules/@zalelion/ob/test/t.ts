import { Observer } from "../src";
import { Change } from "@zalelion/ob-middle-change";
import { Sync } from "@zalelion/ob-middle-sync";
import * as _ from "lodash";

class User {
  private friends: User[] = [];
  private name: string = "";
  public $sync: any;
  constructor(name) {
    this.name = name;
  }
  change(name) {
    this.name = name;
  }
  add(name) {
    const friend = new User(name);
    this.friends.push(friend);
  }
}

var xm = new User("xiao ming");

const ob = new Observer<User>(xm);
ob.use(Change);
ob.use(Sync);

const pxm = ob.proxy;
const cpxm = pxm.$sync(function updater({
  isFun,
  path,
  key,
  parentPath,
  value,
  newValue,
  argv
}) {
  if (isFun) {
    let parent;
    if (parentPath) {
      parent = _.get(cpxm, parentPath);
    } else {
      parent = cpxm;
    }
    parent[key](...argv);
  } else {
    _.set(cpxm, path, value);
  }
});

pxm.add("leo 1 ");

console.log(cpxm);
