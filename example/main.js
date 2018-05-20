const {
  Domain,
  Actor
} = require("..");
const User = require("./User");
const Transfer = require("./Transfer");
const payers_roles = require("./payers");
const charger_roles = require("./charger");
const domain = new Domain({
  // cluster: true
});


domain.register(User).register(Transfer);
domain.addRole(payers_roles).addRole(charger_roles);
const latestEventIndex = Symbol.for("latestEventIndex");

let uid;

main(15);

async function main(money) {
  let fromUser = await domain.create("User.charger.payers", {
    name: "fromUser"
  });
  await fromUser.add(100);
  await fromUser.add(100);
  await fromUser.add(100);
  await fromUser.add(100);
  uid = fromUser.id;
  domain.clearCache(uid);
  fromUser = await domain.get("User.charger.payers", uid);
  let toUser = await domain.create("User.charger.payers", {
    name: "toUser"
  });

  // console.log(await domain._test_findFollowEvents(uid,-1));

  const transfer = await domain.create("Transfer", {});

  try {
    await transfer.transfe(fromUser.id, toUser.id, money);
  } catch (err) {
    console.log(err);
  }


  fromUser = await domain.get("User", fromUser.id);
  console.log(fromUser[latestEventIndex]);

  toUser = await domain.get("User", toUser.id);
  console.log("fromUser's money is ", fromUser.json.money);
  console.log("toUser's money is ", toUser.json.money);
}
