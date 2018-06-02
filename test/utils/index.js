exports.hasThrow = async (fn)=>{
  let error;
  try{
    await fn();
  }catch(err){
    error = err;
  }
  if(!error) throw new Error("no error!");
}
