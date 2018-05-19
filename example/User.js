const { Actor } = require("..");

// domain {actor object}
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
