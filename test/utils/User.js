const {
  Actor
} = require("../../");

module.exports = class User extends Actor {

  static get uniqueFields() {
    return ["unionId"]
  }

  static beforeCreate(data, domain, uniqueOk) {
    if (!uniqueOk)
      throw {
        unionId: "已登陆"
      }
    if (!data.unionId){
      throw {
        unionId: "无unionId"
      }
    }
  }

  // 充值
  recharge(money) {
    money = +money;
    if (money !== money || !Number.isInteger(money)) {
      throw {
        money: "格式不对"
      }
    } else {
      this.$(money);
    }
  }

  constructor(data) {
    const {
      name,
      unionId
    } = data;
    super({
      name: name || "",
      unionId,
      money: 0
    });
  }

  // 更改昵称
  async changeName(name) {
    const uv = await this.$.get("UniqueValidator", "UniqueValidatorUser");
    if (await uv.hold("name", name)) {
      this.$(name);
    } else {
      throw {
        name: "昵称已被注"
      }
    }
  }

  // 设置角色
  setRole(roleId) {
    this.$(roleId);
  }

  get updater() {
    return {
      changeName(json, event) {
        return {
          name: event.data
        }
      },
      setRole(json, event) {
        return {
          roleId: event.data
        }
      },
      recharge(json, event) {
        const money = json.money + event.data;
        return {
          money
        }
      }
    }
  }

}
