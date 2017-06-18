import Event from "../lib/Event";
import { Actor } from "../lib/Actor";
import Snap from "../lib/Snap";
import EventStore from "../lib/DefaultEventStore";
import EventBus from "../lib/EventBus";
import Domain from "../lib/Domain";
import "mocha";
import should from "should";
const assert = require("assert");

describe("Domain", function () {

    var domain = new Domain();

    class User extends Actor {

        static readonly type: "User"

        constructor(data) {
            super(Object.assign({}, data, { money: 0.0 }));

        }

        changename(name) {
            this.service.apply("change", name);
        }

        async jia(money: number) {
            this.service.apply("jia", money);
            return new Promise(function (resolve) {
                setTimeout(resolve, 500);
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
            try {
                const s = this.service;
                s.lock();
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
    }

    domain.register(User).register(T);
    let actorId;
    it("#create", async function (done) {
        domain.eventbus.once({ actorType: "User", type: "change" }, function (event) {
            done()
        });
        const actor = await domain.create("User", { name: "leoleo" });
        actor.changename("sir");
        actorId = actor.id
    })

    it("#get", async function (done) {
        const actor = await domain.get("User", actorId);
        domain.once({ actorType: "User", actorId }, function (e) {
            done();
        });
        actor.changename("ccc");
        assert.ok(actor.name === "ccc");
    })

    let u1, u2, t;
    it("#init", async function (done) {
        u1 = await domain.create("User", { name: "u1" });
        u2 = await domain.create("User", { name: "u2" });
        t = await domain.create("T", {});
        done()
    })

    it("#saga", function () {

        async function f1() {

            await t.t(u1.id, u2.id, 15);

            const user1 = await domain.get("User", u1.id);
            const user2 = await domain.get("User", u2.id);
            console.log(user1.json)
            console.log(user2.json)
        }

        async function f2() {

            await domain.get("User", u1.id);
            

        }

    })
});