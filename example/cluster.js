const cp = require("child_process");
  cp.fork(__dirname+"/main0.js");
  cp.fork(__dirname+"/main1.js");
