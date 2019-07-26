import { Domain, Actor } from "../src";
import * as M from "pouchdb-adapter-memory";
import * as PouchDB from "pouchdb";
import { set } from "lodash";
import * as sleep from "sleep-promise";

PouchDB.plugin(M);

const db = new PouchDB("test", {adapter:"memory"});


var domain = new Domain({ db });

class User extends Actor {
  $sync: any;
  private name: string;
  constructor(name) {
    super();
    this.name = name;
  }
  change(name) {
    this.$cxt.apply("change", name);
  }
  changeHandle({
    type,
    data,
    actorId,
    actorType,
    actorVersion,
    id,
    actorRev,
    createTime
  }) {
    this.name = data;
  }
}

domain.reg(User);

// (async function() {
//    await domain.create<User>("User", ["leo111"]);
//    await domain.create<User>("User", ["leo222"]);
//    await domain.create<User>("User", ["leo333"]);
// })();


(async function() {
    const u = await domain.create<User>("User", ["leo"]);
    const u2 = u.$sync(function({ path, newValue }) {
      set(u2, path, newValue);
    });
    //   console.log(u2);
  
    u.change("hahahhh111111111----aah");
    await u.save();
  //   await u.remove();
    //   console.log(u2);
    u.change("hahahcc1111");
    await u.save();
  
  })();
