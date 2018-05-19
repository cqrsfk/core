CQRS
====
DDD-CQRS-Actor framework.
### Document [ [chinese](https://github.com/liangzeng/cqrs/wiki) ]

Version
=======
    cqrs@1.6.0

Install
=======

    npm install cqrs@latest

Consumers
=========
+ [Node.js Forum](https://github.com/liangzeng/forum)

EventStore
==========
+ [mongodb eventstore](https://github.com/liangzeng/cqrs-mongo-eventstore)
```js
const {Domain} = require("cqrs");
const MongoStore = require("cqrs-mongo-eventstore").default;
const eventstore = new MongoStore("localhost/test");
const domain = new Domain({eventstore});
```

Roadmap
=======
+ preview core
+ use typescript rewrite core
+ saga rollback
+ join the distributed system
+ DCI support
+ ~~use protobuf message~~
+ ~~actor GC~~
+ ~~system time travel~~


Step
====

#### create Actor class

```js
const { Actor } = require("cqrs");
class User extends Actor { /* see example */ }
class Transfer extends Actor { /* see example */ }
```
#### register Actor class to domain

```js
const { domain } = require("cqrs"); // get default domain.
domain.register(User).register(Transfer);
```
#### create/get an Actor instance
```js

// only javascript object

const user = await domain.create("User", {name:"Leo"});
user.json; // get actor instance data.
user.deduct(120.00); // call instance method.

const userInstance = await domain.get("User",userId); // get a User instance.
```

Preview Example
===============

see ES6 [Example](https://github.com/liangzeng/cqrs/tree/master/example)

#### User.js
```js
const { Actor } = require("cqrs");

module.exports = class User extends Actor {

    constructor(data) {
        super({ money: data.money || 0, name: data.name });
    }

    changename(name) {
        this.$(name);
    }

    deduct(money) {
        this.$("deduct", money);
    }

    add(money) {
        this.service.apply("add", money);
    }

    when(event) {
        const data = this.json;
        switch (event.type) {
            case "changename":
                return { name: event.name }
            case "deduct":
                return { money: data.money - event.data }
            case "add":
                return { money: data.money + event.data }
        }
    }

}

```

#### Transfer.js
```js
const { Actor } = require("cqrs");

module.exports = class Transfer extends Actor {

    constructor(data) {
        super({ finish: false });
    }

    log(event) {
        console.log(event);
    }

    async transfe(fromUserId, toUserId, money) {
        const $ = this.$;
        $.lock();
        $.once({ actorType: "User", type: "add" }, "log");
        const fromUser = await $.get("User", fromUserId);
        const toUser = await $.get("User", toUserId);

        fromUser.deduct(money);
        toUser.add(money);

        $.unlock();
        $("finish", null);
    }

    when(event) {
        switch (event.type) {
            case "finish":
                return { finish: true }
        }
    }

}
```

#### main.js
```js
const { domain, Actor } = require("cqrs");
const User = require("./User");
const Transfer = require("./Transfer");

domain.register(User).register(Transfer);

async function main() {

    let fromUser = await domain.create("User", { name: "fromUser" });
    fromUser.add(100);
    let toUser = await domain.create("User", { name: "toUser" });
    const transfer = await domain.create("Transfer", {});
    await transfer.transfe(fromUser.id, toUser.id, 15);


    fromUser = await domain.get("User", fromUser.id);
    toUser = await domain.get("User", toUser.id);
    console.log("fromUser's money is " , fromUser.json.money);
    console.log("toUser's money is " , toUser.json.money);
}

main();
```
#### out
```
fromUser's money is  85
toUser's money is  15
Event {
  data: 100,
  type: 'add',
  method: 'add',
  sagaId: undefined,
  index: 0,
  id: '6459e760-558e-11e7-87a3-9b10ea692d1e',
  actorId: '645887d0-558e-11e7-87a3-9b10ea692d1e',
  actorType: 'User',
  actorVersion: '1.0',
  date: 2017-06-20T07:59:31.542Z }
```

Donate
======

![xxx](https://liangzeng.github.io/weixinzf.png)  微信捐赠

[![](http://www.freepngimg.com/download/paypal_donate_button/2-2-paypal-donate-button-picture.png)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&encrypted=-----BEGIN%20PKCS7-----MIIHiAYJKoZIhvcNAQcEoIIHeTCCB3UCAQExggEwMIIBLAIBADCBlDCBjjELMAkGA1UEBhMCVVMxCzAJBgNVBAgTAkNBMRYwFAYDVQQHEw1Nb3VudGFpbiBWaWV3MRQwEgYDVQQKEwtQYXlQYWwgSW5jLjETMBEGA1UECxQKbGl2ZV9jZXJ0czERMA8GA1UEAxQIbGl2ZV9hcGkxHDAaBgkqhkiG9w0BCQEWDXJlQHBheXBhbC5jb20CAQAwDQYJKoZIhvcNAQEBBQAEgYBri5jxEvrRXSiglQXw8HMTVrCRm8LLQ%2FbFzuDGsK69kTX%2FWgVb9Znw%2F92HiD8HoZKd0htcvo4K1716ckhCc%2BMB3CeZUacDPZbC1rwSRSS4gTFAgTagWgrh1qkvsEGDste9z7i2K8d5uu4RNiUOBmKm3pkqteR4KIlTzSlYiHdTbzELMAkGBSsOAwIaBQAwggEEBgkqhkiG9w0BBwEwFAYIKoZIhvcNAwcECKPiiGNfW32hgIHgXp3%2FgBJUVj9Fol0LlUDNP2T7eu%2BQlouUZsqP67YQHRYFi2A4Vq9aoNYpLSiuiJb74XEFRJ7VzZ6aTwfgd5UdmuQDGkN571edMzaCeEzmIGLZF5K28k1t%2Bk%2BlWubR4Ge%2B5%2B8UIMQDwaNjaDcMj9PabIInZrjXaArxpUzYvXWkCxEj1jbVcPeWkF0OOlOdWz%2BFe6WNN9tbRMIekatuUcG7tDl7KiVDod5%2BPXNOxGJYU18qPh4%2BddCGCqwTE1BYa04dLLWZuczDRWTyL6RSAspL%2B8QG%2Fydr27GPjHSCTWdH6Y%2BgggOHMIIDgzCCAuygAwIBAgIBADANBgkqhkiG9w0BAQUFADCBjjELMAkGA1UEBhMCVVMxCzAJBgNVBAgTAkNBMRYwFAYDVQQHEw1Nb3VudGFpbiBWaWV3MRQwEgYDVQQKEwtQYXlQYWwgSW5jLjETMBEGA1UECxQKbGl2ZV9jZXJ0czERMA8GA1UEAxQIbGl2ZV9hcGkxHDAaBgkqhkiG9w0BCQEWDXJlQHBheXBhbC5jb20wHhcNMDQwMjEzMTAxMzE1WhcNMzUwMjEzMTAxMzE1WjCBjjELMAkGA1UEBhMCVVMxCzAJBgNVBAgTAkNBMRYwFAYDVQQHEw1Nb3VudGFpbiBWaWV3MRQwEgYDVQQKEwtQYXlQYWwgSW5jLjETMBEGA1UECxQKbGl2ZV9jZXJ0czERMA8GA1UEAxQIbGl2ZV9hcGkxHDAaBgkqhkiG9w0BCQEWDXJlQHBheXBhbC5jb20wgZ8wDQYJKoZIhvcNAQEBBQADgY0AMIGJAoGBAMFHTt38RMxLXJyO2SmS%2BNdl72T7oKJ4u4uw%2B6awntALWh03PewmIJuzbALScsTS4sZoS1fKciBGoh11gIfHzylvkdNe%2FhJl66%2FRGqrj5rFb08sAABNTzDTiqqNpJeBsYs%2Fc2aiGozptX2RlnBktH%2BSUNpAajW724Nv2Wvhif6sFAgMBAAGjge4wgeswHQYDVR0OBBYEFJaffLvGbxe9WT9S1wob7BDWZJRrMIG7BgNVHSMEgbMwgbCAFJaffLvGbxe9WT9S1wob7BDWZJRroYGUpIGRMIGOMQswCQYDVQQGEwJVUzELMAkGA1UECBMCQ0ExFjAUBgNVBAcTDU1vdW50YWluIFZpZXcxFDASBgNVBAoTC1BheVBhbCBJbmMuMRMwEQYDVQQLFApsaXZlX2NlcnRzMREwDwYDVQQDFAhsaXZlX2FwaTEcMBoGCSqGSIb3DQEJARYNcmVAcGF5cGFsLmNvbYIBADAMBgNVHRMEBTADAQH%2FMA0GCSqGSIb3DQEBBQUAA4GBAIFfOlaagFrl71%2Bjq6OKidbWFSE%2BQ4FqROvdgIONth%2B8kSK%2F%2FY%2F4ihuE4Ymvzn5ceE3S%2FiBSQQMjyvb%2Bs2TWbQYDwcp129OPIbD9epdr4tJOUNiSojw7BHwYRiPh58S1xGlFgHFXwrEBb3dgNbMUa%2Bu4qectsMAXpVHnD9wIyfmHMYIBmjCCAZYCAQEwgZQwgY4xCzAJBgNVBAYTAlVTMQswCQYDVQQIEwJDQTEWMBQGA1UEBxMNTW91bnRhaW4gVmlldzEUMBIGA1UEChMLUGF5UGFsIEluYy4xEzARBgNVBAsUCmxpdmVfY2VydHMxETAPBgNVBAMUCGxpdmVfYXBpMRwwGgYJKoZIhvcNAQkBFg1yZUBwYXlwYWwuY29tAgEAMAkGBSsOAwIaBQCgXTAYBgkqhkiG9w0BCQMxCwYJKoZIhvcNAQcBMBwGCSqGSIb3DQEJBTEPFw0xODAzMDQwMTAyNDVaMCMGCSqGSIb3DQEJBDEWBBQ5dRQd%2BA4D0dJLF00HB0wyp6Eu3zANBgkqhkiG9w0BAQEFAASBgK%2FFwuKeH71Z41zJQcOpz%2Bbrni1O0XKXQyQXhwqqsYv9uV9A4fw8ifrwlmwv%2F5520SYpNCqeWSYBfBi4SkF2MS3ARKt4H%2BnamhLP5aqLl9poVW5Md%2B6fy%2F3JaUKVkv4P4Cmm7YHctCXtfo8%2BlgvGAa%2BA0zVx8OMtqSP0HLRbmbl8-----END%20PKCS7-----)

LICENSE
=======
GPL2.0
