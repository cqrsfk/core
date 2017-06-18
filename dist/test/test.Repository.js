"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Actor_1 = require("../lib/Actor");
const DefaultEventStore_1 = require("../lib/DefaultEventStore");
require("mocha");
const repository_1 = require("../lib/repository");
const Domain_1 = require("../lib/Domain");
const assert = require("assert");
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
                return Object.assign({}, data, { name: event.data });
        }
    }
}
const domain = new Domain_1.default();
domain.register(User);
describe("Repository", function () {
    var repo, domain;
    var actorId;
    it("#create", function () {
        repo = new repository_1.default(User, new DefaultEventStore_1.default());
    });
    it("#create", async function () {
        const json = await repo.create({ name: "leo" });
        actorId = json.id;
    });
    it("#get", async function () {
        repo.clear(actorId);
        let actor = await repo.get(actorId);
    });
});
//# sourceMappingURL=test.Repository.js.map