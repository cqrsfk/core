import { Domain, Actor } from "../src";
import * as M from "pouchdb-adapter-memory";
import * as PouchDB from "pouchdb";
import { set, get } from "lodash";
import * as sleep from "sleep-promise";

PouchDB.plugin(M);

const db = new PouchDB("test", { adapter: "memory" });

var domain = new Domain({ db });

class User extends Actor {
  public money: number = 100;
  constructor(public name: string = "leo") {
    super();
  }

  static lockFields: string[] = ["money"];

  plus(money: number) {
    this.$cxt.apply("plus", money);
  }

  plusHandle(event) {
    this.money += event.data;
  }

  cut(money: number) {
    this.$cxt.apply("cut", money);
  }

  cutHandle(event) {
    this.money -= event.data;
  }
}

class Transfer extends Actor {
  constructor() {
    super();
  }

  async transfer(fromId, toId) {
    const t = await this.$cxt.createSaga();
    const fromUser = await t.lockGet<User>("User", fromId);
    if (!fromUser) {
      throw new Error("from user no exist");
    }
    const toUser = await t.lockGet<User>("User", toId);
    if (!toUser) {
      return await t.recover();
    }

    if (fromUser && toUser) {
      fromUser.cut(20);
      await fromUser.save();
      toUser.plus(20);
      await toUser.save();
      await t.recover();
      //   console.log(fromUser,toUser)
    }
  }
}

domain.reg(User);
domain.reg(Transfer);

(async function() {
  const u = await domain.create<User>("User", ["from user"]);
  let state = u.$sync(updater);
  function updater({ parentPath, key, isFun, argv, newValue }) {
    let part = {};
    if (parentPath) {
      const pathArr = parentPath.split(".");
      let sub;
      for (let i = 0; i < pathArr.length; i++) {
        if (i === 0) {
          sub = { ...state[pathArr[0]] };
          part = { [pathArr[0]]: sub };
        } else {
          const key = pathArr[i];
          const v = sub[key];
          sub = sub[key] = { ...v };
        }
      }
      sub[key] = newValue;
    } else {
      part = { [key]: newValue };
    }

    state = Object.assign({}, state, part);
  }
//   console.log(cu.money);
  await u.plus(11);
})();

// (async function() {
//     const fromUser = await domain.create<User>("User", ["from user"]);
//     const toUser = await domain.create<User>("User", ["to user"]);
//     const transfer = await domain.create<Transfer>("Transfer", []);
//     try {
//       await transfer.transfer(fromUser._id, toUser._id);
//       console.log(fromUser);
//       console.log(toUser);
//       console.log(transfer);
//     } catch (err) {
//       console.log(err);
//     }
//   })();
