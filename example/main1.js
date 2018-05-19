const { Domain, Actor } = require("..");
const User = require("./User");
const Transfer = require("./Transfer");
const payers_roles = require("./payers");
const charger_roles =require("./charger");
const domain = new Domain({cluster:true});
domain.register(User).register(Transfer);
domain.addRole(payers_roles).addRole(charger_roles);
const latestEventIndex  = Symbol.for("latestEventIndex");
console.log("main",domain.id);

let uid;

function main(money) {

  setTimeout(async function () {
    const u = await domain.get("User",'testuser')
    console.log(u.json.money);
  },5000);

}

main();

// main(220);
