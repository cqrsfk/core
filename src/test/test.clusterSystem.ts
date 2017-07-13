import "mocha";
import { ok } from "assert";
import DomainProxy from "../lib/DomainProxy";
import DomainServer from "../lib/DomainServer";
import DefaultClusterInfoManager from "../lib/DefaultClusterInfoManager";
import Domain from "../lib/Domain";
import { Actor } from "../lib/Actor";

class User extends Actor {
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
            const domainA = new Domain();
            const managerA = new DefaultClusterInfoManager(3000);
            const serverA = new DomainServer(domainA, 3001, "http://localhost:3001", managerA)
            const proxyA = new DomainProxy(managerA);

            const domainB = new Domain();
            const managerB = new DefaultClusterInfoManager("http://localhost:3000");
            const serverB = new DomainServer(domainA, 3002, "http://localhost:3002", managerB)
            const proxyB = new DomainProxy(managerA);

            domainA.register(User);
            domainB.register(User);

            const json = await domainA.create("User", { name: "leo" });
            await managerA.addId(domainA.id, json.id);
            await proxyB.refreshDomainInfo();
            
            const result = await proxyB.getActor("User", json.id);
            console.log(result.json);
            done();
        } catch (err) {
            console.log(err);
            done();
        }



    })

});