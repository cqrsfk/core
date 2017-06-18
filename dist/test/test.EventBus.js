"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Actor_1 = require("../lib/Actor");
const Domain_1 = require("../lib/Domain");
require("mocha");
const assert = require("assert");
describe("EventStore", function () {
    var domain = new Domain_1.default();
    class User extends Actor_1.Actor {
        constructor(data) {
            super(data);
        }
        changename(name) {
            this.service.apply("change", name);
        }
        when(event) {
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
        domain.eventbus.once({ actorType: "User", type: "change" }, function (event) {
            done();
        });
        const actor = await domain.create("User", { name: "leoleo" });
        actor.changename("sir");
        console.log(actor.name);
    });
});
//# sourceMappingURL=test.EventBus.js.map