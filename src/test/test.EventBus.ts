import Event from "../lib/Event";
import { Actor } from "../lib/Actor";
import Snap from "../lib/Snap";
import EventStore from "../lib/DefaultEventStore";
import EventBus from "../lib/EventBus";
import Domain from "../lib/Domain";
import "mocha";
import should from "should";
const assert = require("assert");

describe("EventStore", function () {

    var domain = new Domain();

    class User extends Actor {

        static readonly type: "User"

        constructor(data) {
            super(data);
        }

        changename(name) {
            this.service.apply("change", name);
        }

        when(event: Event) {
            let data = super.when(event);
            switch (event.type) {
                case "change":
                    const d = Object.assign({}, data, { name: event.data });
                    return d;
            }
        }

    }

    domain.register(User);

    it("#", async function (done) {
        domain.eventbus.on({ actorType: "User", type: "change" }, function (event) {
            // console.log(event);
            done()

        });
        try {
            const actor = await domain.create("User", { name: "leoleo" });
            // console.log(actor)
            actor.changename("hhhhh");
        } catch (e) {
            console.log(e);
        }

    })
});