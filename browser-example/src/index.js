import domain from './domain';

let run = async ()=> {
  const json = await domain.create("User",{name:"leo"});

  document.body.innerHTML = `
    <h4>${json}</h4>
  `
}

run();
