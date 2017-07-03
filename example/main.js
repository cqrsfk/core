const { domain, Actor } = require("..");
const User = require("./User");
const Transfer = require("./Transfer");

domain.register(User).register(Transfer);

let uid;

async function main(money) {

    let fromUser = await domain.create("User", { name: "fromUser" });
    fromUser.add(100);
    uid = fromUser.id;

    let toUser = await domain.create("User", { name: "toUser" });
    const transfer = await domain.create("Transfer", {});
    try {
        await transfer.transfe(fromUser.id, toUser.id, money);
    }catch(err){
        console.log(err);
    }

    fromUser = await domain.get("User", fromUser.id);
    toUser = await domain.get("User", toUser.id);
    console.log("fromUser's money is ", fromUser.json.money);
    console.log("toUser's money is ", toUser.json.money);
}

main(15);

// main(220);