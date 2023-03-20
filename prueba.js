const cluster = require('cluster');
const http    = require('http');

const port    = 8000;

const numCPUs = require('os').cpus().length;

const resuFlags = [];
let total     = 0;

const seqNums = ()=>{

  let nums = [];
  for (let i=0;i<=500;i++)
    nums.push(i);

  return nums;
}

const chunkify = (arr, size)=>{
    
    let i,j   = arr.length,

    tempArray = [];
    
    for (i=0; i<j; i+=size)
        tempArray.push(arr.slice(i,i+size));   

    if (tempArray.length>size)
      tempArray[tempArray.length-2]=[...tempArray[tempArray.length-2],...tempArray[tempArray.length-1]];    

    return tempArray

}

const okCalc = ()=>{

  let cont = 0;

  for (let obj in resuFlags){

    if (resuFlags[obj].flag==true)
      cont ++;

  }

  return (cont==numCPUs);
}

const onChildMsg = (msg)=>{

  console.log('Desde el children:',msg);
  
  if (msg.cmd=='Resultado'){
    resuFlags[msg.idProc] = {flag:true,total:msg.valor};
    total = total+parseInt(msg.valor);
  }

  if (okCalc){
    console.log('');
    console.log('PROCESO FINAL, TOTAL:',total,'calculado por', numCPUs,'procesos');
    console.log('');
  }

}

const procMaster = ()=>{

  const loteNums = seqNums();
  let bloqs      = chunkify(loteNums,loteNums.length/numCPUs);

  console.log('Bloque a repartir:',loteNums.length,' entre ',numCPUs,' procesos',numCPUs);
  
  for (let i = 0; i < numCPUs; i++)
    cluster.fork();
  for (const id in cluster.workers){

    cluster.workers[id].on('message',onChildMsg);

    cluster.workers[id].send({cmd:'Peticion de calculo',data:bloqs[id-1],idProc:id});
    resuFlags[id] = {flag:false,total:0};

  }

}

const onMasterMsg = (msg)=>{

  if (msg!=null){

    if (msg.cmd=='Peticion de calculo'){

      if (msg.data!=null){

        console.log('Desde el master:',msg.cmd);
        let calcRESU = msg.data.reduce((a,b)=> a + b , 0);
        process.send({cmd:'Respuesta a la peticion',valor:calcRESU,idProc:msg.idProc});
      }
    }
  }
}

const procChild = ()=>{
  process.on('message', onMasterMsg);

}

if (cluster.isMaster)
  procMaster();
else
  procChild();