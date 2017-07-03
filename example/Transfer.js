const { Actor } = require("..");

module.exports = class Transfer extends Actor {

    constructor(data) {
        super({ finish: false });
    }

    log(event) {
        console.log(event);
    }

    async transfe(fromUserId, toUserId, money) {
        const $ = this.$;
        $.sagaBegin();
        $.lock();
        $.once({ actorType: "User", type: "add" }, "log");
        const fromUser = await $.get("User", fromUserId);
        const toUser = await $.get("User", toUserId);

        fromUser.deduct(money);
        toUser.add(money);

        if (money > 100)
            throw new Error("hhhh")

        $.unlock();
        $.sagaEnd();

        $("finish", null);
    }

    when(event) {
        switch (event.type) {
            case "finish":
                return { finish: true }
        }
    }


}