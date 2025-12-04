(indexing) => {
                    function coloringTheCircles(indexing) {
                        if (indexing.length == 0) {return;}
                        var index_node_counter = 0;
                        var list_of_nodes = document.getElementsByClassName("gnode");
                        for (const [index, node] of Object.entries(list_of_nodes)){
                            if (node.getAttribute("num") == "n-1" && node.getAttribute("struct_name") == "empty" ){
                                document.getElementById("debug").innerHTML += 
                                            'node found |';
                                for (const child of node.children) {
                                    if (child.getAttribute("class") == "fornac-nodeLabel"){
                                        child.innerHTML = indexing[index_node_counter];
                                        index_node_counter += 1

                                    }
                                }
                            }    
                        }
                    }
                    coloringTheCircles(indexing)
				}