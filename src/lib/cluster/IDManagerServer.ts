import * as io from "socket.io";
import * as cio from "socket.io-client";

export class IDManagerServer {

  private idMap = new Map<string, string>();
  private cbMap = new Map<string, any[]>();

  private server;
  constructor(port?: number | string) {
    if (this instanceof IDManagerServer) {
      const server = this.server = io();
      server.on("connection", (socket: SocketIOClient.Socket) => {
        socket.on("bind", (info, cb) => {
          const { domainId, id } = info;
          const _domainId = this.idMap.get(id);
          if (!_domainId) {
            this.idMap.set(id, domainId);
            cb();
          } else if (_domainId === domainId) {
            cb();
          } else {
            let arr = this.cbMap.get(id);
            if(arr){
              arr.push({ cb, info });
            }else{
              this.cbMap.set(id,[{cb, info}])
            }
          }
        })

        socket.on("unbind", info => {
          const { domainId, id } = info;
          const _domainId = this.idMap.get(id);
          if (domainId === _domainId) {
            this.idMap.delete(id);

            let arr = this.cbMap.get(id);
            if (arr && arr.length) {
              const { info, cb } = arr.pop();
              this.idMap.set(id, info.domainId);
              cb();
            }
          }

        });
      });
      server.listen(port || 64321);
      server.on("error",function (parameter) {
      })
    } else {
      return new IDManagerServer(port);
    }
  }
}
