"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("mocha");
const assert_1 = require("assert");
const DefaultClusterInfoManager_1 = require("../lib/DefaultClusterInfoManager");
describe("DefaultClusterInfoManager", function () {
    const server = new DefaultClusterInfoManager_1.default(3009);
    const client = new DefaultClusterInfoManager_1.default("http://localhost:3009");
    it("#test", async function (done) {
        await server.register({ id: "001" });
        await client.register({ id: "002" });
        await client.addId("001", "a003");
        await server.addId("002", "a001");
        await server.addId("002", "a002");
        const domainId = await client.getDomainIdById("a002");
        // await client.logout("001");
        let domainId2 = await client.getDomainIdById("a003");
        assert_1.ok(domainId2 === "001");
        assert_1.ok(domainId === "002");
        await client.logout("001");
        domainId2 = await client.getDomainIdById("a003");
        assert_1.ok(domainId2 === null);
        console.log((await client.getAllDomainInfo()));
        await client.deleteID("a002");
        console.log((await client.getIdMap()).get("002"));
        done();
    });
});
//# sourceMappingURL=test.DefaultClusterInfoManager.js.map