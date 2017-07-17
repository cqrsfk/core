require("./runDomainA");

setImmediate(function(){
    require("./runDomainB")
})