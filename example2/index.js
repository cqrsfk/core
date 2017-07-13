const Domain = require("../dist/lib/Domain").default;
const DefaultClusterInfoManager = require("../dist/lib/DefaultClusterInfoManager").default;
const DomainServer = require("../dist/lib/DomainServer").default;
const DomainProxy = require("../dist/lib/DomainProxy").default;

const domain = new Domain();
const manager = new DefaultClusterInfoManager(3000);
const server = new DomainServer(domain, 3001, "http://localhost:3001", manager)
const proxy = new DomainProxy(manager);



