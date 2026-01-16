def sequence_coloring(first_seq, second_seq) -> list:
    """Generate a color list for two sequences.

    Produces a list of CSS color names where each element of `first_seq`
    is mapped to "lightsalmon" and each element of `second_seq` is mapped
    to "lightgreen". The returned list length equals len(first_seq) + len(second_seq).

    Args:
        first_seq (Sequence): Iterable representing the first sequence.
        second_seq (Sequence): Iterable representing the second sequence.

    Returns:
        list[str]: Color names for each position in the concatenated sequences.

    Example:
        >>> sequence_coloring("ACG", "UU")
        ['lightsalmon', 'lightsalmon', 'lightsalmon', 'lightgreen', 'lightgreen']
    """
    color = []
    color += ["lightsalmon" for _ in first_seq]
    color += ["lightgreen" for _ in second_seq]

    return color


def changeBackgroundColor(page, v):
    """Color circle elements on the page according to two sequences.

    Executes JavaScript in the provided `page` context to set the `fill`
    style of circle elements (selector '[r="5"]') based on the color list
    produced by `sequence_coloring`.

    Args:
        page: Playwright-like page object used to evaluate JavaScript.
        v (dict): Dictionary containing at least "sequence1" and "sequence2".

    Returns:
        None
    """
    for var in ["sequence1", "sequence2"]:
        assert var in v
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
    """Compute and set node labels and marker indices for both sequences.

    Builds a numbering for sequence positions using provided offsets (handles
    RNA-style counting that omits zero), updates node title elements with
    the computed labels, inserts two separator entries between sequences to
    match Fornac's indexing, and sets visible marker labels for every 10th
    node.

    Args:
        page: Playwright-like page object used to evaluate JavaScript.
        v (dict): Dictionary with keys:
            - "offset1" (int): Start offset for sequence 1.
            - "offset2" (int): Start offset for sequence 2.
            - "sequence1" (Sequence): First sequence.
            - "sequence2" (Sequence): Second sequence.

    Returns:
        None
    """
    for var in ["offset1", "offset2", "sequence1", "sequence2"]:
        assert var in v
    offset1 = v["offset1"]
    offset2 = v["offset2"]
    length1 = len(v["sequence1"])
    length2 = len(v["sequence2"])
    numbering = []

    for (seq, offset, length) in [("s1", offset1, length1),("s2", offset2, length2)]:
        numbering += [(seq, i) for i in range(offset, length+offset, 1)]
        # with rna counting works like: -2, -1, 1, 2, 3, ... 
        if (seq, 0) in numbering:
            # range added a 0, we remove it
            numbering.remove((seq, 0))
            # we removed one index, so we need to add one again at the end
            sequence, number = numbering[-1]
            numbering += [(sequence, number + 1)]

    page.evaluate("""(numbering) => {
            var list_of_nodes = document.querySelectorAll('[r="5"]');
            for (const [index, node] of Object.entries(list_of_nodes)){
                title_element = node.children[0];
                title_element.innerHTML = numbering[index];
            }
        }""", [f"{seq}[{str(num)}]" for (seq, num) in numbering])
    
    # adding the 2 empty nodes between the 2 sequences, 
    # because fornac counts them in when constructing index nodes
    numbering = numbering[:length1] + [("e", 0), ("e", 0)] + numbering[length1:]

    # changing the indexing for the marker, showing the index for every 10 nodes
    indexing = []
    # index for the first sequence
    # numbering = [(seq1, 1), ...] 
    indexing = [str(numbering[i][1]) for i in range(9, len(numbering), 10)]

    page.evaluate("""(indexing) => {
            var list_of_text_elements = document.querySelectorAll('[label_type="label"]');
            for (const [index, node] of Object.entries(list_of_text_elements)){
                node.innerHTML = indexing[index];   
            }
        }""", indexing)
    
    if "0" in indexing:
        removeWrongMarker(page, indexing.index("0"))


def removeWrongMarker(page, index_remove):
    """Hide an incorrect marker and its corresponding link in the DOM.

    Removes a wrongly generated index marker (here set as 0 index) 
    by setting the CSS `display` property to `none` for both the marker 
    node and its associated label link at the given position.

    The function executes JavaScript in the provided `page` context and
    operates on elements selected via the attributes `[num="n-1"]` (marker
    nodes) and `[link_type="label_link"]` (marker links).

    Args:
        page: Playwright page object used to evaluate JavaScript.
        index_remove (int): Index of the marker/link pair to hide.

    Returns:
        None
    """
    page.evaluate("""(index_remove) => {
            var list_of_node_elements = document.querySelectorAll('[num="n-1"]');
            for (const [index, node] of Object.entries(list_of_node_elements)){
                if (index == index_remove) {
                    node.setAttribute("style", "display:none");
                }
            }
            var list_of_link_elements = document.querySelectorAll('[link_type="label_link"]');
            for (const [index, node] of Object.entries(list_of_link_elements)){
                if (index == index_remove) {
                    node.setAttribute("style", "display:none");
                }                
            }
        }""", index_remove)
    
    
def highlightingRegions(page, v):
    """
    Highlight contiguous intermolecular basepair regions for both structures.

    Uses `listIntermolPairs` to find intermolecular basepair indices in
    `structure1` and `structure2`, converts the second structure's local
    indices to Fornac's global indexing, and sets a red stroke on all circle
    nodes within those regions.

    Args:
        page: Playwright-like page object used to evaluate JavaScript.
        v (dict): Dictionary with keys:
            - "structure1" (str): Dot-bracket notation for first structure.
            - "structure2" (str): Dot-bracket notation for second structure (must be non-empty).

    Raises:
        AssertionError: If `structure2` is empty or if no intermolecular pairs are found.

    Returns:
        None
    """
    for var in ["structure1", "structure2"]:
        assert var in v
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
    """
    Highlight individual intermolecular basepair circles.

    Determines basepairs whose partners lie on different sides of the split
    (split = len(sequence1)) by reading existing basepair link elements in
    the DOM, and sets a red stroke on the corresponding circle nodes.

    Args:
        page: Playwright-like page object used to evaluate JavaScript.
        v (dict): Dictionary containing at least "sequence1" (Sequence).

    Returns:
        None
    """
    assert "sequence1" in v
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
    Return sorted indices of intermolecular basepairs in dot-bracket notation.

    Analyzes a secondary structure string (dot-bracket notation, no pseudoknots)
    and returns a sorted list of 0-based indices that belong to intermolecular
    basepairs. Opening/closing parentheses "()" and angle brackets "<>" are
    handled independently: unmatched opens at the end or unmatched closes are
    considered intermolecular.

    Args:
        struc (str): Structure string in dot-bracket notation.

    Returns:
        list[int]: Sorted indices (0-based) of positions that are part of intermolecular basepairs.

    Example:
        >>> listIntermolPairs("((..))..))")
        [8, 9]

    For the following example Structures, the intermolecular basepairs are indicated with carets (^):s
    eg (())...((...(())  and (())...))...(())
    eg ((..(..)) and ((..)..))
       ^                     ^

    eg ((((...))... and ...))..
       ^^                  ^^
    eg ((<<...))... and ...>>..
         ^^                ^^
    '''
    inter_basepairs = []
    open_basepairs = {"(": [], "<": [], "[": [], "{": []}
    basepairs = [("(",")"), ("[","]"), ("{", "}"), ("<",">")]
    for index, char in enumerate(struc):
        for (open, close) in basepairs:
            # check for open basepair, add to stack
            if char == open:
                open_basepairs[open] += [index]
                break               
            # check for close basepair, remove from stack
            # if stack empty, it is an intermolecular basepair
            if char == close:
                if open_basepairs[open]:
                    open_basepairs[open].pop()
                else:
                    inter_basepairs += [index]
                break

    # all remaining open basepairs in the stack are intermolecular
    for pairs in open_basepairs.values():
        inter_basepairs += pairs

    inter_basepairs.sort()
    return inter_basepairs


