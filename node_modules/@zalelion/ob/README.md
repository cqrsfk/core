# Object observer

### observe before get object's property

```js
// returned before observed, internal execution middle.get(argv)
obj.sub.name;
```

### observe before/after set object's property

```js
// before observed , internal execution middle.beforeSet(argv)
obj.sub.name = "zale";
// after observed , internal execution middle.afterSet(argv)
```

### observe before/after apply object's method

```js
// before observed , internal execution middle.beforeApply(argv)
obj.sub.change("lion");
// after observed , internal execution middle.afterApply(argv)
```

### observe before/after delete object's property

```js
// before observed, internal execution middle.beforeDelete(argv)
delete obj.sub.name;
// after observed, internal execution middle.afterApply(argv)
```

# Install

> npm install @zalelion/ob

# API

```ts
import { Observer } from "@zalelion/ob";

var obj = {};

const { proxy, emitter, use, isProxy } = new Observer(obj);

```

# Middleware

## Middle interface

```ts
interface MiddlewareConstructor {
  new (ob: Observer<any>): Middleware;
}

interface Middleware {
  get?: GetMiddle;
  beforeSet?: BeforeSetMiddle;
  afterSet?: AfterSetMiddle;
  beforeApply?: BeforeApplyMiddle;
  afterApply?: AfterApplyMiddle;
  beforeDelete?: BeforeDeleteMiddele;
  afterDelete?: AfterDeleteMiddle;
}
```

## Custom JSON middleware

```js
// ES6
class JSONMiddle {
  constructor(observer) {
    this.observer = observer;
  }

  get({ root, parentPath, key }) {
    // E.g.
    // obj.json , then parentPath is "" null string.
    // obj.sub.json , then parentPath is "sub".
    if (value && !parentPath && key === "json") {
      return JSON.parse(JSON.stringify(root));
    }
    return value;
  }
}
```

### Observe and use middleware

```js
const { Observer, factory } = require("@zalelion/ob");

const obj = {
  name: "Zale Lion",
  change(name) {
    this.name = name;
  }
};

// Use global's middleware
// Observer.Middles.push(JSONMiddle);

// For a class of objects.
// const SubObserver = factory();
// SubObserver.Middles.push(JSONMiddle);

const { use, proxy: proxyObj } = new Observer(obj);
// use middle for only a assign object
use(JSONMiddle);
```

### use

```js
console.log(proxyObj.json); // Output:  {name:"Zale Lion"}
```

## Third-party middleware
- [Change](https://github.com/zalelion/ob-middle-change)
- [Sync](https://github.com/zalelion/ob-middle-sync)

## License

Apache-2.0
