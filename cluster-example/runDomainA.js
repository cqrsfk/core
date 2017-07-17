const { Domain } = require("..");
const User = require("./User");
const domainA = new Domain({
    domainServerPort: 3001,
    domainServerUrl: "http://localhost:3001",
    clusterPort: 3000
});

domainA.register(User);

// 创建一个 User
domainA.create("User", { name: "leo" ,id:"id001"})
domainA.on({ type: "changename" }, event => console.log("名字已改成：", event.data));