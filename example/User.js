const { Actor } = require("..");

module.exports = class User {
    constructor(name, money) {
        super({ name, money });
    }

    changename(name) {
        this.$.apply(name);
    }

    deduct(money) {
        this.$.apply("deduct", money);
    }

    add() {
        const $ = this.service;
        $.apply("add", money);
    }

    when(event) {
        switch (event.type) {
            case ""
        }
    }

}
