# Rewriting


# life cycle

beforeCreate

created

beforeApply

beforeSend

afterSend

afterApply

beforeRemove

removed

# API

# Actor

## static beforeCreate(argv:any[])

## static json(actor:Actor): any

## static parse(json:any): Actor

## json():any;

## save()

## remove()

# Service

## send(type:string , data:any)

## subscribe(event:{actorId, actorType , type}, listener:string);

## unsubscribe(event [, listener]);

if handle , then only unsubscribe listener
else unscribe all listener

## find / findRows

see PouchDB.find API.

## get(type,id)

## createSaga()

# Saga

## async begin(actor:Actor)

## async end

## Example:

```ts
const t = await this.service.createSaga();
const user1 = await this.service.get("User", id1);
const user2 = await this.service.get("User", id2);
await t.begin(user1, user2);

// try {
//   user1.pay(100);
//   user2.recharge(100);
//   user1.save();
//   user2.save();
// } catch (err) {
//   await t.revert();
// }

// or

await t.run(() => {
  user1.pay(100);
  user2.recharge(100);
  user1.save();
  user2.save();
});

await end();
```

```ts
import { Actor, Domain } from "cqrs";

const db:PouchDB.Database;

class Book extends Actor {

  static beforeCreate(argv:any[], service:Service){
      // validate argv
  }

  constructor(private name: string) {
    super();
  }

  created(){

  }

  beforeApply(){

  }

  beforeSend(event){

  }

  changeName(name) {
    // this.service.send("changeNameHandle", name);
    this.service.send(name);
  }

  afterSend(event){

  }

  afterApply(){

  }

  private changeNameHandler(event) {
    const name = event.data as string;
    this.name = name;
  }

  beforeRemove(){

  }

  removed(){

  }

}

const domain = new Domain({
  defaultDB:db
});

domain.reg(Book[, db]);

// domain.find("Book",)
```
