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
        $.lock();
        $.once({ actorType: "User", type: "add" }, "log");
        const fromUser = await $.get("User", fromUserId);
        const toUser = await $.get("User", toUserId);

        fromUser.deduct(money);
        toUser.add(money);

        $.unlock();
        $("finish", null);
    }

    when(event) {
        switch (event.type) {
            case "finish":
                return { finish: true }
        }
    }


}