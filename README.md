CQRS
====
DDD-CQRS-Actor framework.
### Document [ [chinese](https://github.com/liangzeng/cqrs/wiki) ]

Version
=======
    cqrs@2.10.0

Install
=======

    npm install cqrs

    yarn add cqrs

Consumers
=========
+ [Auxo](https://github.com/liangzeng/auxo)  (vue & express & cqrs framework)
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

LICENSE
=======
MIT
