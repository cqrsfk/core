export default async function sleep(time?:number){
    return new Promise(resolve=>setImmediate(()=>setTimeout(resolve,time)));
}