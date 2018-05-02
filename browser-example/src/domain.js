import {domain} from '../..';
import {User} from "./User";
import {UserManager} from "./UserManager";

export default domain.register(User).register(UserManager);
