import {Actor} from '../..';

export class UserManager extends Actor {

   static getType(){
     return 'UserManager';
   }

   constructor(data){
     super({
       start:false
     });
   }

   async listen(){
     if(!this.json.start) {
       this.$();
       await this.$.subscribe({actorType:'User'},"handle");
     }
   }

   handle(event){
     console.log(event);
   }

   updater(){
     return {
       listen(json,event){
         return {start:true}
       }
     }
   }

}
