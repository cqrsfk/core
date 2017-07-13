const M = require("../lib/DefaultCluterInfoManager").default;
async function test() {
    const server = new M(3000);
    const proxy = new M("http://localhost:3000");
    const result = await proxy.getIdMap();
    console.log(result);
}

test();
