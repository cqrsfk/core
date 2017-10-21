const { Actor } = require("..");

module.exports = class Transfer extends Actor {

    constructor(data) {
        super({ finish: false });
    }

    log(event) {
        console.log(event);
    }

    async transfe(fromUserId, toUserId, money) {
      try{
        const $ = this.$;
        $.sagaBegin();
        $.lock();

        $.once({ actorType: "User", type: "add" }, "log");
        console.log(fromUserId,toUserId);
        const fromUser = await $.get("User.payers", fromUserId);
        const toUser = await $.get("User.charger", toUserId);

        fromUser.deduct(money);

        toUser.add(money);

        if (money > 100)
            throw new Error("hhhh")

        $.unlock();
        $.sagaEnd();

        $("finish", null);
      }catch(e){
        console.log(e);
      }
    }



    get updater(){
      return {
        finish(data,event) {
            return { finish: true }
        }
      }
    }

}
