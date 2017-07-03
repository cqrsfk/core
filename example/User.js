const { Actor } = require("..");

// domain {actor object}
module.exports = class User extends Actor {

    constructor(data) {
        super({ money: data.money || 0, name: data.name });
    }

    //
    changename(name) {

        this.$("changename", { name }, true);  // direct
        this.service.apply("changename", name);
        this.$.apply("changename", name);
    }

    deduct(money) {
        this.$("deduct", money);
    }

    add(money) {
        this.service.apply("add", money);
    }

    when(event) { // reduct react
        const data = this.json;
        switch (event.type) {
            case "changename":
                return { name: event.name }
            case "deduct":
                return { money: data.money - event.data }
            case "add":
                return { money: data.money + event.data }
        }
    }

}
