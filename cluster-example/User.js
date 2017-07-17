const { Actor } = require("..");
module.exports = class User extends Actor {
    
    constructor(data) {
        super(data);
    }

    changename(name) {
        this.$(name);
    }

    when(event) {
        switch (event.type) {
            case "changename":
                return { name: event.data };
        }
    }
}