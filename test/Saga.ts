import test from "ava";

import {
  Actor,
  Domain,
  Action,
  Changer,
  Mutation,
  Saga,
  Event
} from "../src/main";

import * as M from "pouchdb-adapter-memory";
import * as PouchDB from "pouchdb";

PouchDB.plugin(M);

// process.on("unhandledRejection",e=>console.log(e))

const db = new PouchDB("test", { adapter: "memory" });

class User extends Actor {
  money = 0;
  constructor() {
    super();
  }
  @Mutation({ event: "add" })
  add(money: number) {
    this.money += money;
  }
}

class Transfer extends Saga {
  constructor() {
    super();
  }
  async recoverHandle(events: Event[]) {
    for (let evt of events) {
      if (evt.type === "add") {
        const u = await this.$cxt.get<User>(
          evt.actorType,
          evt.actorId,
          this._id
        );
        await u.add(-evt.data);
      }
    }
  }

  @Action()
  async run(fromUserId, toUserId) {
    const fromUser = await this.$cxt.get<User>("User", fromUserId);
    const toUser = await this.$cxt.get<User>("User", toUserId);
    fromUser.add(-100);
    toUser.add(100);

    await fromUser.save();
    await toUser.save();
    await this.begin([fromUser, toUser]);
  }
}

test("Saga", async function(t) {
  var domain = new Domain({ name:"test2",db });
  domain.reg(Transfer);
  domain.reg(User);

  const fromUser = await domain.create<User>("User", []);
  const toUser = await domain.create<User>("User", []);

  await fromUser.add(110);
  await fromUser.save();

  const transfer = await domain.create<Transfer>("Transfer", []);

  await transfer.run(fromUser._id, toUser._id);
  t.is(fromUser.money, 10);
  t.is(toUser.money, 100);
  await transfer.recover();
  t.is(fromUser.money, 110);
  t.is(toUser.money, 0);
  t.pass();
});
