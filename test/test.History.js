const should = require("should");
const User = require("./utils/User");
const {Domain} = require("..");
const {hasThrow} = require("./utils")

const domain = new Domain();
domain.register(User);

describe("History",function () {

  let userId;
  it("#init",async ()=> {
    let user = await domain.create("User",{unionId:"01"});
    userId = user.id;
    await user.recharge(10);
    await user.recharge(10);
    await user.recharge(10);
    await user.recharge(10);
    user = await domain.get("User",userId);
    user.json.money.should.eql(40);
  });

  it("#history",async function () {

    let history = await domain.getHistory("User",userId,"recharge");
    let u = history.get();
    u.money.should.eql(40);
    u  = history.prev();
    u.money.should.eql(30);
    u  = history.prev();
    u.money.should.eql(20);
    u  = history.prev();
    u.money.should.eql(10);
    u  = history.prev();
    u.money.should.eql(0);
    u  = history.prev();
    should.not.exist(u);
    u  = history.prev();
    should.not.exist(u);

    u  = history.next();
    u.money.should.eql(10);

    u  = history.next();
    u.money.should.eql(20);

    u  = history.next();
    u.money.should.eql(30);

    u  = history.next();
    u.money.should.eql(40);
    u  = history.next();
    should.not.exist(u);

  })
});
