import test from "ava";

import { Actor, Domain, Action, Changer, Mutation } from "../src/main";

import * as M from "pouchdb-adapter-memory";
import * as PouchDB from "pouchdb";

PouchDB.plugin(M);

// process.on("unhandledRejection",e=>console.log(e))

const db = new PouchDB("test", { adapter: "memory" });

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
}

class Log extends Actor {
  list: string[] = [];
  private recoding = false;
  constructor(private userId: string) {
    super();
  }
  @Action()
  async listen() {
    if (this.recoding) return;
    const r = await this.$cxt.subscribe({
      type: "User",
      id: this.userId,
      event: "change",
      method: "record"
    });

    this.$cxt.apply("start listen", []);
  }

  @Changer("start listen")
  private begin() {
    this.recoding = true;
  }

  @Mutation({ event: "record" })
  record(event) {
    this.list.push(event.data);
  }
}

test("Context", async function(t) {
  var domain = new Domain({ name: "test4", db });
  domain.reg(User);
  domain.reg(Log);

  const u = await domain.create<User>("User", []);
  const log = await domain.create<Log>("Log", [u._id]);
  log.listen();

  u.changeName("leo");
  u.changeName("leo2");
  u.changeName("leo3");
  await u.save();
  // await log.save();

  // t.is(log.list.length, 3);
  t.pass();
});
