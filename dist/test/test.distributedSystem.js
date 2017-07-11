"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Domain_1 = require("../lib/Domain");
const Actor_1 = require("../lib/Actor");
const DomainProxy_1 = require("../lib/DomainProxy");
const DomainServer_1 = require("../lib/DomainServer");
const domain = new Domain_1.default();
class User extends Actor_1.Actor {
    constructor(data) {
        super(data);
    }
    changename(name) {
        this.$(name);
    }
    when(event) {
        switch (event.type) {
            case "changename":
                return { name: event.data };
        }
    }
}
domain.register(User);
const server = new DomainServer_1.default(domain, [...domain.repositorieMap.values()]);
const proxy = new DomainProxy_1.default("http://localhost:3002");
//# sourceMappingURL=test.distributedSystem.js.map