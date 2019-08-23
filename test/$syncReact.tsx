import test from "ava";
import { cloneDeep, get } from "lodash";
import * as sleep from "sleep-promise";
import { reactStateSync } from "../src/utils/reactStateSync";
import * as Enzyme from "enzyme";
import * as Adapter from "enzyme-adapter-react-16";
Enzyme.configure({ adapter: new Adapter() });
const { shallow } = Enzyme;

import { Actor, Domain, Action, Changer, Mutation } from "../src/main";

import * as M from "pouchdb-adapter-memory";
import * as PouchDB from "pouchdb";

import * as React from "react";
import * as ReactDOM from "react-dom";

function Comp(props) {
  return <button>{props.name}</button>;
}

PouchDB.plugin(M);

const db = new PouchDB("test", { adapter: "memory" });

function updater(vm, path) {
  return function(change) {
    const ob = get(vm.state, path);
    const newOB = reactStateSync({ ...change, state: ob });

    const pathArr = path.split(".");
    const obKey = pathArr.pop();

    let sub, newState;
    for (let i = 0; i < pathArr.length; i++) {
      if (i === 0) {
        const v = ob[pathArr[0]];
        sub = { ...v };
        newState = { [pathArr[0]]: sub };
      } else {
        const key = pathArr[i];
        const v = sub[key];
        sub = sub[key] = { ...v };
      }
    }
    if (sub) {
      sub[obKey] = newOB;
    } else {
      newState = { [obKey]: newOB };
    }
    vm.setState(newState);
  };
}

class User extends Actor {
  name: string = "";
  constructor() {
    super();
  }
  @Action({
    validater(name: string) {
      if (name.length > 6) throw new Error("name.length can't > 6");
    }
  })
  changeName(name: string) {
    this.$cxt.apply("change", name);
  }

  @Changer("change")
  changeMyName(event) {
    this.name = event.data;
  }

  @Mutation({ event: "change2" })
  changeMyName2(name) {
    this.name = name + 2;
  }
}

test("@Action", async function(t) {
  var domain = new Domain({ db });
  domain.reg(User);

  interface IState {
    user?: any;
  }

  class UI extends React.Component<any, IState> {
    private ud;
    private userProto: User;
    constructor(prop) {
      super(prop);
      this.state = {};
    }

    async componentWillMount() {
      this.userProto = await domain.create<User>("User", []);
      this.ud = updater(this, "user");
      const user = this.userProto.$sync(this.ud);
      this.setState({
        user
      });
    }

    stop() {
      this.userProto.$stopSync(this.ud);
    }

    changename() {
      this.userProto && this.userProto.changeName(this.state.user.name + 1);
    }

    render() {
      return (
        <div>
          {this.state.user && this.state.user.name}
          <button onClick={this.changename.bind(this)}>click</button>
        </div>
      );
    }
  }

  const wrapper = shallow(<UI />);
  await sleep(500);
  t.is(wrapper.state("user").name, "");
  wrapper.find("button").simulate("click");
  await sleep(500);
  t.is(wrapper.state("user").name, "1");
  wrapper.instance().stop();
  wrapper.find("button").simulate("click");
  await sleep(500);
  t.is(wrapper.state("user").name, "1");

  t.pass();
});
