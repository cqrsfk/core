const { Domain, Actor } = require("..");
const User = require("./User");
const Transfer = require("./Transfer");
const payers_roles = require("./payers");
const charger_roles =require("./charger");
const domain = new Domain({cluster:true});
domain.register(User).register(Transfer);
domain.addRole(payers_roles).addRole(charger_roles);
const latestEventIndex  = Symbol.for("latestEventIndex");

let uid;

async function main(money) {
  let fromUser = await domain.create("User.charger.payers", { id:"testuser",name: "fromUser" });
  await fromUser.add(100);
  await fromUser.add(100);
  await fromUser.add(100);
  setTimeout(function () {
    console.log(fromUser.json.money);
    fromUser.unbind();
  },2000);
}

main(100);

// main(220);
