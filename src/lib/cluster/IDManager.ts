import * as io from "socket.io";
import * as cio from "socket.io-client";
import Domain from '../Domain';

export class IDManager {

  private domainId:string;
  private holdIds = new Set();

  constructor(
    private domain: Domain,
    private socket: SocketIOClient.Socket) {
      this.domainId = domain.id;
  }

  async unbind(id) {
    this.holdIds.delete(id);
    this.socket.emit("unbind",{domainId:this.domainId,id});
  }

  isHold(id){
    return this.holdIds.has(id);
  }

  async bind(id) {

    if(this.isHold(id)) return;

    var that = this;
    return new Promise(resolve=>{

      let timeout = false;

      // timeout
      let t = setTimeout(()=>{
        timeout = true;
        resolve("timeout");
      },1000);

      this.socket.emit("bind",{domainId:this.domainId,id}, (err,result)=> {
        clearTimeout(t);
        this.holdIds.add(id);
        if(!timeout){
          resolve();
        }
      });

    })
  }

}
