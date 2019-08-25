import test from "ava";

import { Actor, Domain, Action, Changer, Mutation } from "../src/main";

import * as M from "pouchdb-adapter-memory";
import * as PouchDB from "pouchdb";
import * as sleep from "sleep-promise";

PouchDB.plugin(M);

const db = new PouchDB("test2", { adapter: "memory" });

class User extends Actor {
  name: string = "";
  constructor() {
    super();
  }
  @Action({
    validater(name: string) {
      if (name.length > 6) throw new Error("name.length can't > 6");
    }
  })
  changeName(name: string) {
    this.$cxt.apply("change", name);
  }

  @Changer("change")
  changeMyName(event) {
    this.name = event.data;
  }

  @Mutation({ event: "change2" })
  changeMyName2(name) {
    this.name = name + 2;
  }
}

test("@Action", async function(t) {
  var domain = new Domain({ name: "test3", db });
  var pass = false;
  domain.reg(User);
  domain.on(
    {
      type: "change",
      actor: "User"
    },
    function() {
      pass = true;
    }
  );
  const u = await domain.create<User>("User", []);
  await u.changeName("leo");
  await t.throwsAsync(async () => await u.changeName("dddddsfsdd"));
  await u.save();
  await sleep(500);

  t.true(pass);
  t.is("leo", u.name);
});

test("@Mutation", async function(t) {
  var domain = new Domain({ name: "test000", db });
  var pass = false;
  domain.reg(User);
  domain.on(
    {
      type: "change2",
      actor: "User"
    },
    function() {
      pass = true;
    }
  );
  const u = await domain.create<User>("User", []);
  await u.changeMyName2("leo");
  await u.save();
  await sleep(500);
  t.true(pass);
  t.is("leo2", u.name);
});
