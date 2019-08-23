# MVP

### Root API

```ts
class User extends Root {
  static version = 1.0;
  static type = "User";

  constructor() {}

  @Action({ validater })
  changeAction(name) {

  }

  @Mutation({ event, validater })
  changeMutation(){

  }

  @Changer({event});
  private change(event){

  }

  

}
```

```ts

const domain = new Domain();
domain.reg(User);

const user = await domain.create("User", ["name"] );

await user.changeAction("leo");

```