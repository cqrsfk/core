const { Domain } = require("..");
const User = require("./User");

const domainB = new Domain({
    domainServerPort: 3002,
    domainServerUrl: "http://localhost:3001",
    clusterUrl: "http://localhost:3000"
});

domainB.register(User);

domainB.get("User", "id001").then(function(user ){
    user.changename("lllleo");
})