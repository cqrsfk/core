import {domain,Actor} from '../..';

class User extends Actor {

   static getType(){
     return 'User';
   }

   constructor(data){
     super(data);
   }

   changename(name){
     this.$(name);
   }

   updater(){
     return {
       changename(json,event){
         return {name:event.data}
       }
     }
   }

}

export default domain.register(User);
