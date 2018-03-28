
import Actor from "./Actor";
export default class Role {
   constructor(
     public readonly name:string,
     private supportedActorNames:string[],
     public readonly methods:any,
     public readonly updater:any = {}){
   }

   // [actor , {roleA, roleB} ]
   wrap(actor:Actor|Array<any>){
      if(Array.isArray(actor)){
         const act = actor[0];
         if(!this.supportedActorNames.includes(act.type))
            throw new Error(this.name+"role don't support "+act.type + " actor.");
         const roles = actor[1];
         roles[this.name] = this;
         return actor;
      }else{
         return [actor, {[this.name]:this}]
      }
   }
}
