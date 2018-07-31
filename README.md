CQRS
====
DDD-CQRS-Actor framework.
### Document [ [chinese](https://github.com/liangzeng/cqrs/wiki) ]

Version
=======
    cqrs@2.10.11

Install
=======

    npm install cqrs

    yarn add cqrs

Consumers
=========
+ [Auxo](https://github.com/liangzeng/auxo)  (vue & express & cqrs framework)

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

[Example](https://github.com/liangzeng/cqrs/tree/master/example)

#### User.js
```js
const { Actor } = require("..");

module.exports = class User extends Actor {

    constructor(data) {
        super({ money: data.money || 0, name: data.name, id:data.id });
    }

    changename(name) {
        this.$.apply("changename", name);
    }

    get updater(){
       return {
          changename(data,event){
            return { name: event.name }
          }
       }
    }

}


```

```js
const { Actor } = require("cqrs");

module.exports = class Transfer extends Actor {

    constructor(data) {
        super({ finish: false });
    }

    log(event) {
        // console.log(event,"21121----2");
    }

    async transfe(fromUserId, toUserId, money) {
      try{
        const $ = this.$;
        $.sagaBegin();
        $.lock();

          await $.subscribe({ actorType: "User"}, "log");
          // await $.unsubscribe({ actorType: "User"});
          await $.subscribe({ actorType: "User", actorId:toUserId , type: "add" }, "log");
          // await $.unsubscribe({ actorType: "User", actorId:toUserId , type: "add" });


        // console.log(fromUserId,toUserId);
        const fromUser = await $.get("User.payers", fromUserId);
        const toUser = await $.get("User.charger", toUserId);

        fromUser.deduct(money);

        toUser.add(money);

        if (money > 100)
            throw new Error("hhhh")

        $.unlock();
        $.sagaEnd();

        $("finish", null);
      }catch(e){
        // console.log(e);
      }
    }



    get updater(){
      return {
        finish(data,event) {
            return { finish: true }
        }
      }
    }

}
```

LICENSE
=======
MIT
