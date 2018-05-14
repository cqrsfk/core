import LocalDomain from '../Domain';
import Manager from './Manager';

export default class Domain {

  private manager : Manager;
  private $domain : LocalDomain;

  constructor({ manager }){
    this.manager = manager;
    this.$domain = new LocalDomain(); // todo
  }

  create(type:string,data){
    // todo
    return this.$domain.create(type,data);
  }

  get(type:string , id:string){
    // todo
    return this.$domain.get(type,id);
  }

  

}
