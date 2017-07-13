"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("mocha");
const DomainProxy_1 = require("../lib/DomainProxy");
const DomainServer_1 = require("../lib/DomainServer");
const DefaultClusterInfoManager_1 = require("../lib/DefaultClusterInfoManager");
const Domain_1 = require("../lib/Domain");
const Actor_1 = require("../lib/Actor");
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
describe("Cluster System", function () {
    it("test", async function (done) {
        try {
            const domainA = new Domain_1.default();
            const managerA = new DefaultClusterInfoManager_1.default(3000);
            const serverA = new DomainServer_1.default(domainA, 3001, "http://localhost:3001", managerA);
            const proxyA = new DomainProxy_1.default(managerA);
            const domainB = new Domain_1.default();
            const managerB = new DefaultClusterInfoManager_1.default("http://localhost:3000");
            const serverB = new DomainServer_1.default(domainA, 3002, "http://localhost:3002", managerB);
            const proxyB = new DomainProxy_1.default(managerA);
            domainA.register(User);
            domainB.register(User);
            const json = await domainA.create("User", { name: "leo" });
            await managerA.addId(domainA.id, json.id);
            await proxyB.refreshDomainInfo();
            const result = await proxyB.getActor("User", json.id);
            console.log(result.json);
            done();
        }
        catch (err) {
            console.log(err);
            done();
        }
    });
});
//# sourceMappingURL=test.clusterSystem.js.map