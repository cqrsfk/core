CQRS
====
DDD-CQRS-Actor framework.


Preview Example (can't run)
===========================

#### User.ts
```ts
import {Actor} from "cqrs";

export default class User extends Actor {

    static readonly type: "User"

    constructor(data) {
        super(data);
    }

    changename(name) {
        this.service.apply("change", name);
    }

    save(money: number) {
        return new Promise((resolve) => {
            this.service.apply("save", money);
            setTimeout(resolve, 1000); // timeout
        })
    }

    deduct(money: number) {
        this.service.apply("deduct", money);
    }

    
    when(event: Event) {

        let data = super.when(event);

        switch (event.type) {
            case "change":
                return Object.assign({}, data, { name: event.data });

            case "save":
                let money1 = data.money + event.data;
                return Object.assign({}, data, { money: money1 });

            case "deduct":
                let money2 = data.money - event.data;
                return Object.assign({}, data, { money: money2 });
        }
    }

}
```

#### Transfer.ts
```ts
import {Actor} from "cqrs";

export default class Transfer extends Actor {

    async transfer(fromUserId, toUserId, money) {

            
            const $ = this.service;

            $.lock();  // Lock operation user （Optional）
            $.sagaBegin();  // sagaId , can rollback . （Optional）

            const fromUser = await $.get("User", fromUserId);
            const toUser = await $.get("User", toUserId);
            
            // transfer money
            fromUser.deduct(money);
            toUser.jia(money);
            
            s.sagaEnd();
            s.unlock();
       

    }
}
```

#### run.ts
```ts
import User from "User";
import Transfer from "Transfer";
import {Domain} from "cqrs";

const domain = new Domain();
domain.register(Transfer).register(User);

async function run(){
    
    const fromUser = await domain.create("User",{name:"fromUser", money: 120});
    const toUser = await domain.create("User",{name:"toUser", money: 0});
    const transfer = await domain.create("Transfer");
    await transfer.transfer(fromUser.id,toUser.id, 100); // finish!

}

run();

```

Roadmap
=======
+ preview core (can't run)
+ use typescript rewrite core (can't run)
+ ~~join the distributed system~~
+ ~~use protobuf message~~

LICENSE
=======
MIT

