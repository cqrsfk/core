const { Domain, Actor } = require("..");
const User = require("./User");
const sleep = require('./sleep');

var domain  = new Domain({cluster:true});
domain.register(User);

async function run(){
  await domain.waitInited();
  const user = await domain.create('User',{id:'id01',name:"id01---bbbbbbb"});
  sleep(1000);
  await user.changename("llll",'id02')
}

run();
