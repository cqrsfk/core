const should = require("should");
const User = require("./utils/User");
const {Domain} = require("..");
const {hasThrow} = require("./utils")

const domain = new Domain();
domain.register(User);

describe("UniqueValidator",function () {
  it("#create", async ()=>{
      await hasThrow(async f=>await domain.create("User",{}));
      await domain.create("User",{unionId:"001"})
      hasThrow(async ()=>await domain.create("User",{unionId:"001"}));
      await domain.create("User",{unionId:"002"})
  })
})
