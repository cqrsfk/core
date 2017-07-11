import Domain from "../lib/Domain";
import { Actor } from "../lib/Actor";
import DomainProxy from "../lib/DomainProxy";
import DomainServer from "../lib/DomainServer";
const domain = new Domain();

class User extends Actor {
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

domain.register(User);

const server = new DomainServer(domain, [...domain.repositorieMap.values()])

const proxy = new DomainProxy("http://localhost:3002");

