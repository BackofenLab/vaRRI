
def sequence_coloring(first_seq, second_seq) -> list:
    color = []
    color += ["lightsalmon" for _ in first_seq]
    color += ["lightgreen" for _ in second_seq]

    return color


def changeBackgroundColor(page, v):

    coloring = sequence_coloring(v["sequence1"], v["sequence2"])
    
    # color all circles with the given color in the coloring list
    page.evaluate("""(coloring) => {
            function coloringTheCircles(coloring) {
                if (coloring.length == 0) {return;}
                var list_of_nodes = document.querySelectorAll('[r="5"]');
                for (const [index, node] of Object.entries(list_of_nodes)){            
                    node.setAttribute("style", "fill: " + coloring[index] + ";");
                }
            }
            coloringTheCircles(coloring)
        }""", coloring)
    
def updateIndexing(page, v):
    # TODO more comments, explain whats happening
    offset1 = v["offset1"]
    offset2 = v["offset2"]
    length1 = len(v["sequence1"])
    length2 = len(v["sequence2"])
    numbering = []

    for (offset, length) in [(offset1, length1),( offset2, length2)]:
        numbering += [i for i in range(offset, length+offset, 1)]
        if 0 in numbering:
            numbering.remove(0)
            numbering += [numbering[-1] + 1]

    page.evaluate("""(numbering) => {
            var list_of_nodes = document.querySelectorAll('[r="5"]');
            for (const [index, node] of Object.entries(list_of_nodes)){
                title_element = node.children[0];
                title_element.innerHTML = numbering[index];
            }
        }""", [str(i) for i in numbering])
    
    # adding the 2 empty nodes between the 2 sequences, 
    # because fornac counts them in when constructing index nodes
    numbering = numbering[:length1] + ["e", "e"] + numbering[length1:]

    # changing the indexing for the marker, showing the index for every 10 nodes
    indexing = []
    # index for the first sequence
    indexing = [str(numbering[i]) for i in range(9, len(numbering)+1, 10)]

    page.evaluate("""(indexing) => {
            var list_of_text_elements = document.querySelectorAll('[label_type="label"]');
            for (const [index, node] of Object.entries(list_of_text_elements)){
                node.innerHTML = indexing[index];                            
            }
        }""", indexing)

    
def highlightingRegions(page, v):
    structure1 = v["structure1"]
    structure2 = v["structure2"]
    
    basepair_region = []
    assert structure2 != ""

    for structure in [structure1, structure2]:
        basepair_list = listIntermolPairs(structure)
        assert basepair_list
        # fornac starts counting nodes with 1 -> list index start with 0
        region = (basepair_list[0]+1, basepair_list[-1]+1)
        basepair_region += [region]

    # transform from local indexing to fornac indexing
    local_start, local_end = basepair_region[1]
    # offset the start and end by the length of the first molecule 
	# and 2 nodes that make up the separation of the 2 molecules
    offset = len(structure1) + 2
    basepair_region[1] = (local_start + offset, local_end + offset)

    page.evaluate("""(basepair_region) => {
            for (const [start, final] of basepair_region){
                for (let index = start; index <= final; index++) {
                    node = document.querySelector('circle[node_num="' + index.toString() + '"]'); 
                    style = node.getAttribute("style");
                    node.setAttribute("style", style + "stroke: red;");          
                    }
            }
        }""", basepair_region) 
    

def highlightingBasepairs(page, v):
    # split after sequence 1
    split = len(v["sequence1"])
    # searches for all basepairs. if the bases are on both sides of the split, 
    # it is a intermolecular basepair. higlight those bases with a red circle

    page.evaluate("""(split) => {
        var list_of_basepair_links = document.querySelectorAll('[link_type="basepair"]');
        var basepair_indicies = [];
        for (const [index, node] of Object.entries(list_of_basepair_links)){
            text = node.children[0].innerHTML;
            basepairs = text.split(":")[1];
            basepair_node_1 = basepairs.split("-")[0];
            basepair_node_2 = basepairs.split("-")[1];
            if (basepair_node_1 < split && basepair_node_2 > split) {                          
                basepair_indicies.push(basepair_node_1);
                basepair_indicies.push(basepair_node_2);
            }
        }

        for (const index of basepair_indicies){
            node = document.querySelector('circle[node_num="' + index.toString() + '"]'); 
            style = node.getAttribute("style");
            node.setAttribute("style", style + "stroke: red;");
        }
    }""", split)  

def listIntermolPairs(struc):
    '''
    takes a structure and returns a list of indicies 
    where intermolecular basepairs are, given no pseudoknots

    in the first sequence:
    if a bracket doesnt close it is a intermol bracket
    we just return the list of not closed brackets at the end

    in the second sequence:
    if a brackets closes, but there are no opened brackets,
    it is a intermol bracket
    we add those to the inter basepair list


    eg (())...((...(())&(())...))...(())
    eg ((..(..))&((..)..))
       ^                 ^
    '''
    inter_basepairs = []
    basepairs = []
    for index, char in enumerate(struc):
        if char == "(":
            basepairs += [index]
        if char == ")":
            if basepairs:
                basepairs.pop()
            else:
                inter_basepairs += [index]
    
	# TODO think about possibillity of intermol basepairs in both? idk if makes sense
    return inter_basepairs if not basepairs else basepairs


