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
    color += ["lightblue" for _ in first_seq]
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
    for var in ["offset1", "offset2", "sequence1", "sequence2", "labelInterval"]:
        assert var in v
    offset1 = v["offset1"]
    offset2 = v["offset2"]
    length1 = len(v["sequence1"])
    length2 = len(v["sequence2"])
    interval = int(v["labelInterval"])
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
    
    setIndexMarkers(page, v, numbering)

def setIndexMarkers(page, v, numbering):
    """
    Set index markers for sequence positions with priority-based placement.

    Determines which positions should display index markers based on a
    three-tier priority system: sequence boundaries (highest priority),
    basepair region boundaries (medium priority), and regular intervals
    (lowest priority). Uses `validateMarkerPos` to avoid overlapping markers
    and executes JavaScript to update the DOM with the computed marker labels.

    Args:
        page: Playwright-like page object used to evaluate JavaScript.
        v (dict): Dictionary with keys:
            - "structure1" (str): Dot-bracket notation for first structure.
            - "structure2" (str): Dot-bracket notation for second structure.
            - "sequence1" (Sequence): First sequence.
            - "labelInterval" (int): Interval for regular marker placement.
        numbering (list[tuple[str, int]]): List of (sequence_id, position) tuples
            representing the numbering for all positions.

    Returns:
        None
    """
    for var in ["structure1", "structure2", "sequence1", "labelInterval", "molecules"]:
        assert var in v
    length1 = len(v["sequence1"])
    interval = int(v["labelInterval"])
    structure1 = v["structure1"]
    structure2 = v["structure2"]
    molecules = v["molecules"]

    # adding the 2 empty nodes between the 2 sequences, 
    # because fornac counts them in when constructing index nodes
    numbering = numbering[:length1] + [("e", 0), ("e", 0)] + numbering[length1:]

    # making a new list, indexing, which shall define which Marker should display
    # an index and which wont. [0: no marker, number: show marker]
    indexing = [0 for _ in numbering]
 
    
    # prio:
    # start and end of sequence
    # start and end of first basepairs
    # every 10th index

    # numbering: list of actual indicies[-5, -4, -3, -2, ...] (list of numbers)
    # indexing : list of indicies and 0 [-5, 0, 0, -2, ...]
    # psoition: position of the marker in the list (eg number -5 is at position 0)
    # number: actual indicie at position x


    # ----------------- prio 1 -------------------------------
    # show marker: [at the beginning of the first sequence,
    #                at the end of the first sequence,
    #                at the beginning of the second sequence,
    #                at the end of the fsecond sequence]
    for pos in [0, length1-1, length1+2, -1]:
        if pos < len(indexing):
            seq, number = numbering[pos]
            indexing[pos] = validateMarkerPos(pos, indexing, number)

    # ----------------- prio 2 -------------------------------
    # get the position of the first and last intermol basepair in both sequences
    if molecules == "2":
        basepair_region = getBasepairRegions(structure1, structure2)
        # add at the start and end positions a marker with the correct number
        for region in basepair_region:
            # fornac starts counting the nodes with 1
            # region postions also are based on starting position 1
            # we need to substract 1 to have a starting position of 0
            start_pos = region[0] - 1
            end_pos = region[1] - 1
            seq, start_number = numbering[start_pos]
            seq, end_number = numbering[end_pos]
            indexing[start_pos] = validateMarkerPos(start_pos, indexing, start_number)
            indexing[end_pos] = validateMarkerPos(end_pos, indexing, end_number)

    # ----------------- prio 3 -------------------------------
    # numbering = [(seq1, 1), ...] 
    # show marker for every 10th index 
    for index, tuple in enumerate(numbering):
        seq, number = tuple
        if number % interval == 0:
            indexing[index] = validateMarkerPos(index, indexing, number)    


    page.evaluate("""(indexing) => {
            var list_of_text_elements = document.querySelectorAll('[label_type="label"]');
            for (const [index, node] of Object.entries(list_of_text_elements)){
                node.innerHTML = indexing[index];   
            }
        }""", indexing)
    

    while 0 in indexing:
        fix_index = indexing.index(0)
        removeWrongMarker(page, fix_index)
        indexing[fix_index] = ""


def validateMarkerPos(pos: int, indexing: list, number: int) -> int:
    """
    Validate whether a marker should be placed at the given position.

    Checks if either neighboring position already has a marker set (non-zero value).
    If a neighbor has a marker, returns 0 to prevent overlapping markers.
    Otherwise, returns the number to allow marker placement.

    Args:
        pos (int): Position index in the indexing list to validate.
        indexing (list[int]): Current indexing list where non-zero values
            indicate existing markers.
        number (int): The number to potentially place at this position.

    Returns:
        int: The number if placement is allowed, 0 if placement should be prevented
        to avoid overlap with neighboring markers.
    """
    neighbors = (pos - 1, pos + 1)

    # special case pos -1 and 0, they are not next to each other
    if pos == -1:
        neighbors = [pos-1]
    if pos == 0:
        neighbors = [pos+1]

    for neighbor in neighbors:
        # check if neighbor pos is inside list
        if neighbor > -len(indexing) and neighbor < len(indexing):
            # check if neighbor is already displaying a number
            if indexing[neighbor] != 0:
                # if thats true, this index Marker should not
                # display any number
                return 0
    
    # if both neighors do not already display a number
    # a marker at this position is allowed
    return number


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

    Uses `getBasepairRegions` to identify the ranges of positions involved
    in intermolecular basepairs for both structures, then executes JavaScript
    to set a red stroke on all circle nodes within those regions in the DOM.

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
    
    assert structure2 != ""

    basepair_region = getBasepairRegions(structure1, structure2)

    page.evaluate("""(basepair_region) => {
            for (const [start, final] of basepair_region){
                for (let index = start; index <= final; index++) {
                    node = document.querySelector('circle[node_num="' + index.toString() + '"]'); 
                    style = node.getAttribute("style");
                    node.setAttribute("style", style + "stroke: red;");          
                    }
            }
        }""", basepair_region)
    
def getBasepairRegions(structure1, structure2):
    """
    Determine contiguous intermolecular basepair regions for both structures.

    For each structure, identifies the range of positions involved in
    intermolecular basepairs using `listIntermolPairs`, converts from
    0-based to 1-based indexing, and adjusts the second structure's
    indices to Fornac's global coordinate system by adding an offset
    equal to the length of the first structure plus 2 (for separator nodes).

    Args:
        structure1 (str): Dot-bracket notation for the first RNA structure.
        structure2 (str): Dot-bracket notation for the second RNA structure.

    Returns:
        list[tuple[int, int]]: List of (start, end) tuples representing
        the 1-based index ranges of intermolecular basepair regions for
        both structures, with the second structure's indices adjusted
        to global Fornac coordinates.

    Raises:
        AssertionError: If no intermolecular basepairs are found in either structure.
    """
    basepair_region = []

    for structure in [structure1, structure2]:
        basepair_list = listIntermolPairs(structure)
        if not basepair_list:
            return []
        # fornac starts counting nodes with 1 -> list index start with 0
        region = (basepair_list[0]+1, basepair_list[-1]+1)
        basepair_region += [region]

    # transform from local indexing to fornac indexing
    local_start, local_end = basepair_region[1]
    # offset the start and end by the length of the first molecule 
	# and 2 nodes that make up the separation of the 2 molecules
    offset = len(structure1) + 2
    basepair_region[1] = (local_start + offset, local_end + offset)

    return basepair_region

    

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

def removeSecondLink(page):
    page.evaluate("""() => {
        var list_of_basepair_links = document.querySelectorAll('[link_type="basepair"]');
        list_of_basepair_links.forEach(link => {
            basepairs = link.children[0].textContent.split(":")[1];
            var [id_node_1, id_node_2] = basepairs.split("-");

            if (Number(id_node_1) > Number(id_node_2)){
                link.remove();
            }
        });
    }""")


def visualiseBasepairStength(page, v):
    for var in ["sequence1", "sequence2"]:
        assert var in v

    # building an array that can be accessed using the ids stored in the fornac graph links
    # eg the ids start with 1
    # eg the 2 invisible nodes between both mols, also have their own ids
    sequence = ["."] + list(v["sequence1"]) + [".", "."] + list(v["sequence2"])

    page.evaluate("""(sequence) => {
        var list_of_basepair_links = document.querySelectorAll('[link_type="basepair"]');
        list_of_basepair_links.forEach(link => {
            basepairs = link.children[0].textContent.split(":")[1];
            var [id_node_1, id_node_2] = basepairs.split("-");
            // l1 short for nucleotide letter of node 1
            l1 = sequence[Number(id_node_1)];
            l2 = sequence[Number(id_node_2)];

            if ((l1 == "G" && l2 == "U") || (l1 == "U" && l2 == "G")) {
                link.setAttribute("stroke-dasharray","1,1");     
            }
        });
    }""", sequence)
