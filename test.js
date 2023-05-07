
let tree = [{
    nodeName: "body",
    children: [{
      nodeName: "div",
      children: [{
        nodeName: "span"
      }]
    }, {
      nodeName: "div",
      children: [{
        nodeName: "p"
      }, {
        nodeName: "p"
      }]
    }]
  }]
  
  function find(tree){
      for(let k in tree){
          let e = tree[k];
          if(typeof(e)=='object'){
              find(e);
          }else{
              console.log(e);
          }
      }
  }
  find(tree);
  