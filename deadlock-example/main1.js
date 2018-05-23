const { Domain, Actor } = require("..");
const User = require("./User");
const sleep = require('./sleep');

var domain  = new Domain({cluster:true});
domain.register(User);

async function run(){
  await domain.waitInited();
  const user = await domain.create('User',{id:'id02',name:"id02---aaaaaaa"});
  sleep(1000);
  await user.changename("oooo",'id01')
}

run();
