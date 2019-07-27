import { Domain, Actor } from "../src";
import * as M from "pouchdb-adapter-memory";
import * as PouchDB from "pouchdb";
import { set } from "lodash";
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

  plus(money) {
    this.$cxt.apply("plus", money);
  }

  plusHandle(event) {
    this.money += event.data;
  }

  cut(money) {
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
  const fromUser = await domain.create<User>("User", ["from user"]);
  const toUser = await domain.create<User>("User", ["to user"]);
  const transfer = await domain.create<Transfer>("Transfer", []);
  try {
    await transfer.transfer(fromUser._id, toUser._id);
    console.log(fromUser);
    console.log(toUser);
    console.log(transfer);
  } catch (err) {
    console.log(err);
  }
})();
