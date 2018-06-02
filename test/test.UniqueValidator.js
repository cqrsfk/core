const should = require("should");
const User = require("./utils/User");
const {Domain} = require("..");
const {hasThrow} = require("./utils")

const domain = new Domain();
domain.register(User);

describe("UniqueValidator",function () {
  let userId;
  it("#create", async ()=>{
      await hasThrow(async f=>await domain.create("User",{}));
      const user = await domain.create("User",{unionId:"001"})
      userId = user.id;
      hasThrow(async ()=>await domain.create("User",{unionId:"001"}));
      await domain.create("User",{unionId:"002"})
  });

  it("#giveup",async ()=>{
    const uv = await domain.get("UniqueValidator","User");

    uv.giveup(
      "unionId","001"
    )
    const user = await domain.create("User",{unionId:"001"})

  });
})
