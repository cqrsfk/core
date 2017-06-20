import Event from "../lib/Event";
import { Actor } from "../lib/Actor";
import Snap from "../lib/Snap";
import EventStore from "../lib/DefaultEventStore";
import EventBus from "../lib/EventBus";
import Domain from "../lib/Domain";
import "mocha";
import should from "should";
const assert = require("assert");


var domain = new Domain();

class User extends Actor {

    static readonly type: "User"

    constructor(data) {
        super(Object.assign({}, data, { money: 0.0 }));

    }

    changename(name) {
        this.service.apply("change", name);
    }

    jia(money: number) {
        return new Promise((resolve) => {
            this.service.apply("jia", money);
            setTimeout(resolve, 1000);
        })

    }

    jian(money: number) {
        this.service.apply("jian", money);
    }

    when(event: Event) {
        let data = super.when(event);

        switch (event.type) {
            case "change":
                return Object.assign({}, data, { name: event.data });
            case "jia":
                let money1 = data.money + event.data;
                return Object.assign({}, data, { money: money1 });

            case "jian":
                let money2 = data.money - event.data;
                return Object.assign({}, data, { money: money2 });
        }
    }

}

class T extends Actor {

    async t(u1, u2, money) {
        this.service.once({ actorType: "User", actorId: u2 }, "log");

        try {
            const s = this.service;
            s.lock(200);
            s.sagaBegin();

            const user1 = await s.get("User", u1);
            const user2 = await s.get("User", u2);
            user1.jia(100);
            user2.jia(100);

            user1.jia(20);
            user2.jian(20);
            s.sagaEnd();
            s.unlock();
        } catch (e) {
            console.log(e)
        }


    }

    log(event) {
        console.log(event);
    }
}

domain.register(User).register(T);
let actorId;
// it("#create", async function (done) {
//     domain.eventbus.once({ actorType: "User", type: "change" }, function (event) {
//         done()
//     });
//     const actor = await domain.create("User", { name: "leoleo" });
//     actor.changename("sir");
//     actorId = actor.id
// })

// it("#get", async function (done) {
//     const actor = await domain.get("User", actorId);
//     domain.once({ actorType: "User", actorId }, function (e) {
//         done();
//     });
//     actor.changename("ccc");
//     assert.ok(actor.name === "ccc");
// })

let u1, u2, t;
async function test() {
    u1 = await domain.create("User", { name: "u1" });
    u2 = await domain.create("User", { name: "u2" });
    t = await domain.create("T", {});

    async function f1() {

        await t.t(u1.id, u2.id, 15);
        console.log("aaaaa");

        const user1 = await domain.get("User", u1.id);
        const user2 = await domain.get("User", u2.id);
        // console.log(user1.json)
        // console.log(user2.json)
    }

    async function f2() {

        const u = await domain.get("User", u1.id);
        await u.jian(22);
        console.log('cccccc')

    }

    f1();
    f2();

}

test();
