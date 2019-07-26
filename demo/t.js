const patrun = require("patrun");

const pm = patrun();
pm.add({a:1},"A")
pm.add({b:1,c:1},"B")
pm.add({c:1},"C")


const r = pm.find({a:1,c:1});

console.log(r)