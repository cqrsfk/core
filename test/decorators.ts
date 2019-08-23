import test from "ava";

import { Action } from "../src/decorators/Action";
import { Changer } from "../src/decorators/Changer";
import { Mutation } from "../src/decorators/Mutation";

function validater(name) {
  if (name.length > 6) {
    throw new Error("name has error!");
  }
}

test("test", t => {
  class User2 {
    static version = 1.0;
    static type = "User";
    @Action({ validater })
    change(name) {}

    @Mutation({
      validater,
      event: "change name"
    })
    changeName(name) {}

    @Changer("change my name")
    changeHandler(name) {}
  }

  const mutations = Reflect.getMetadata("mutations", User2);
  t.is(Object.keys(mutations).length, 1);
  t.is(Object.keys(mutations)[0], "changeName");

  const actions = Reflect.getMetadata("actions", User2);
  t.is(Object.keys(actions).length, 1);
  t.is(Object.keys(actions)[0], "change");

  const changers = Reflect.getMetadata("changers", User2);
  t.is(Object.keys(changers).length, 1);
  t.is(Object.keys(changers)[0], "change my name");
});
