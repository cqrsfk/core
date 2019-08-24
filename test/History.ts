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

test("test", async function(t) {
  var domain = new Domain({ db });
  domain.reg(User);

  const u = await domain.create<User>("User", []);
  u.add(10);
  u.add(10);
  u.add(10);
  u.add(10);
  u.add(10);
  t.is(50, u.money);

  await u.save();

  const history = await u.history();
  let user = history.get<User>();
  t.is(user.money, 0);
  history.next();
  history.next();
  history.next();
  history.next();
  history.next();
  history.next();
  history.next();
  history.next();
  user = history.next<User>();
  t.is(user.money, 50);

  user = history.prev<User>();
  user = history.prev<User>();
  t.is(user.money, 30);

  user = history.latest();

  t.is(user.money, 50);

});
