const { domain, Actor } = require("..");
const User = require("./User");
const Transfer = require("./Transfer");

domain.register(User).register(Transfer);

async function main() {

    let fromUser = await domain.create("User", { name: "fromUser" });
    fromUser.add(100);
    let toUser = await domain.create("User", { name: "toUser" });
    const transfer = await domain.create("Transfer", {});
    await transfer.transfe(fromUser.id, toUser.id, 15);

    
    fromUser = await domain.get("User", fromUser.id);
    toUser = await domain.get("User", toUser.id);
    console.log("fromUser's money is " , fromUser.json.money);
    console.log("toUser's money is " , toUser.json.money);
}

main();