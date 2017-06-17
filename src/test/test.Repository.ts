import Event from "../lib/Event";
import { Actor } from "../lib/Actor";
import Snap from "../lib/Snap";
import EventStore from "../lib/DefaultEventStore";
import "mocha";
import should from "should";
import Repository from "../lib/repository";
import Domain from "../lib/Domain";
const assert = require("assert");

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
                return Object.assign({}, data, { name: event.data });
        }
    }

}

const domain = new Domain();
domain.register(User);

describe("Repository", function () {
    var repo: Repository, domain;
    var actorId;
    it("#create", function () {
        repo = new Repository(User, new EventStore());
    })
    it("#create", async function () {
        const json = await repo.create({ name: "leo" });
        actorId = json.id;
    })

    it("#get", async function () {
        console.log(repo.exist(actorId));
        repo.clear(actorId);
        console.log(repo.exist(actorId));
        let actor = await repo.get(actorId);
        console.log(actor instanceof Actor);
    })
})

