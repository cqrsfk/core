import domain from './domain';



let run = async ()=> {
  const manager = await domain.create("UserManager");
  await manager.listen();
  const actor = await domain.create("User",{name:"leo"});
  document.body.innerHTML = `
    <h4>${actor.json.id + actor.json.name}</h4>
  `
}

run();
