const { Domain, Actor } = require("..");
const User = require("./User");
const Transfer = require("./Transfer");
const payers_roles = require("./payers");
const charger_roles =require("./charger");

const domain = new Domain();
domain.register(User).register(Transfer);
domain.addRole(payers_roles).addRole(charger_roles);

let uid;

async function main(money) {
  let fromUser = await domain.create("User.charger.payers", { name: "fromUser" });
  fromUser.add(100);
  uid = fromUser.id;

  let toUser = await domain.create("User.charger.payers", { name: "toUser" });
  // console.log(fromUser.json,toUser.json);

  const transfer = await domain.create("Transfer", {});

  try {
      await transfer.transfe(fromUser.id, toUser.id, money);
  }catch(err){
      console.log(err);
  }

  fromUser = await domain.get("User", fromUser.id);
  toUser = await domain.get("User", toUser.id);
  // console.log("fromUser's money is ", fromUser.json.money);
  // console.log("toUser's money is ", toUser.json.money);
}

main(15).catch(function (err) {
  console.log(err);
});

// main(220);
