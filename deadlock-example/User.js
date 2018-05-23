const { Actor } = require("..");

// domain {actor object}
module.exports = class User extends Actor {

    constructor(data) {
        super({ money: data.money || 0, name: data.name, id:data.id });
    }

    async changename(name,uid) {
        console.log(name, uid);
        const u = await this.$.get('User',uid);
        console.log("-------",this.json.name);
        // this.$.apply("changename", name);
    }

    get updater(){
       return {
          changename(data,event){
            return { name: event.name }
          }
       }
    }

}
