from utils import (runCommand,listIntermolNodes)
import re 

# invisible Nodes between 2 molecules, seperating them
GAP = 3

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
    assert coloring != []
    # TODO check coloring.length == 0 cant happen

    # color all circles with the given color in the coloring list
    page.evaluate("""(coloring) => {
            if (coloring.length == 0) {return;}
            var list_of_nodes = document.querySelectorAll('[r="5"]');
            for (const [index, node] of Object.entries(list_of_nodes)){            
                node.setAttribute("style", "fill: " + coloring[index] + ";");
            }
        }""", coloring)
    
def updateNodeToolTips(page, v):
    """Compute and set node labels and marker indices for both sequences.

    Builds a numbering for sequence positions using provided offsets (handles
    RNA-style counting that omits zero), updates node title elements with
    the computed labels, inserts 3 separator entries between sequences to
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
    index_dict = {str(i): v for i, v in getIndexDictionary(v).items()}

    # TODO ?
    page.evaluate("""(index_dict) => {
            for (const [key, value] of Object.entries(index_dict)) {
                var [seq, num] = value;
                document.querySelectorAll('circle[node_num="'+ key + '"]').forEach((node) => {
                    node.firstChild.innerHTML = `${seq}[${num}]`;
              });
          }
        }""", index_dict)


def getSequenceIndicies(seq, offset, length):
    indicies = [(seq, i) for i in range(offset, length+offset, 1)]
    # with rna counting works like: -2, -1, 1, 2, 3, ... 
    if (seq, 0) in indicies:
        # range added a 0, we remove it
        indicies.remove((seq, 0))
        # we removed one index, so we need to add one again at the end
        sequence, number = indicies[-1]
        indicies += [(sequence, number + 1)]
    return indicies

def getIndexDictionary(v):
    for var in ["offset1", "offset2", "sequence1", "sequence2"]:
        assert var in v

    offset1 = v["offset1"]
    offset2 = v["offset2"]
    length1 = len(v["sequence1"])
    length2 = len(v["sequence2"])

    # adding the 2 empty nodes between the 2 sequences, 
    # because fornac counts them in when constructing index nodes
    gap_list = [("e", 0)] * GAP
    # [("e", 0), ("e", 0), ("e", 0)]
    indicies = getSequenceIndicies("s1", offset1, length1) + gap_list + getSequenceIndicies("s2", offset2, length2)

    return {i: [seq, num] for i, (seq, num) in enumerate(indicies, 1)}

        

        

def setIndexLabels(page, v):
    """
    Set index markers for sequence positions with priority-based placement.

    Determines which positions should display index markers based on a
    three-tier priority system: sequence boundaries (highest priority),
    basepair region boundaries (medium priority), and regular intervals
    (lowest priority). Uses `validateLabelPos` to avoid overlapping markers
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
    for var in ["structure1", "structure2", "sequence1", "labelInterval", "molecules", "sequence_dict"]:
        assert var in v
    length1 = len(v["sequence1"])
    length_total = len(v["sequence_dict"])
    interval = int(v["labelInterval"])
    structure1 = v["structure1"]
    structure2 = v["structure2"]
    molecules = v["molecules"]

    index_dict: dict = getIndexDictionary(v)


    # making a new dict, which shall define which Label should display
    # an index and which wont. [0: no label, number: show label]
    index_labels: dict = {i: 0 for i in index_dict.keys()}
 
    
    # prio:
    # start and end of sequence
    # start and end of first basepairs
    # every 10th index

    # index_dict: dict of actual indicies {1:-5, 2:-4, 3:-3, 4:-2, ...} 
    # index_labels : dict of indicies and 0  {1:-5, 2:0,  3:0,  4:-2, ...}
    # pos: position of the label

    # ----------------- prio 1 -------------------------------
    # show marker: [at the beginning of the first sequence,
    #                at the end of the first sequence,
    #                at the beginning of the second sequence,
    #                at the end of the second sequence]
    for pos in [1  , length1, length1+GAP+1, length_total]:
        if pos not in index_dict: break
        _, number = index_dict[pos]
        index_labels[pos] = validateLabelPos(pos, index_labels, number)

    # ----------------- prio 2 -------------------------------
    # get the position of the first and last intermol basepair in both sequences
    if molecules == "2":
        basepair_region = getIntermolBasepairRegion(structure1, structure2)
        # add at the start and end positions a label with the correct number
        for region in basepair_region:
            for pos in region:
                _, number = index_dict[pos]
                index_labels[pos] = validateLabelPos(pos, index_labels, number)
                colorLabelRed(page, pos)

    # ----------------- prio 3 -------------------------------
    # numbering = [(seq1, 1), ...] 
    # show marker for every 10th index 
    for pos, (_, number) in index_dict.items():
        if number % interval == 0 or number == 1:
            index_labels[pos] = validateLabelPos(pos, index_labels, number)    
    
    page.evaluate("""(indexing) => {
            document.querySelectorAll('[label_type="label"]').forEach((label,index)=>{
                        label.innerHTML = indexing[index];   
                  });   
        }""", list(index_labels.values()))

    
    for pos, value in index_labels.items():
        if value == 0:
            removeLabel(page, pos)
            removeLabellink(page,pos)

def colorLabelRed(page, target_index):
    """


    Args:
        page: Playwright page object used to evaluate JavaScript.
        target_index (int): Index of the marker/link pair mark red.

    Returns:
        None
    """
    page.evaluate("""(target_index) => {
            document.querySelectorAll(`[label_num="${target_index}"]`).forEach((label) => {
                  label.setAttribute("style", "stroke: red;stroke-width: 0.8;");
                  });
        }""", str(target_index))


def validateLabelPos(pos: int, indexing: dict, number: int) -> int:
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

    for neighbor in neighbors:
        # check if neighbor pos is inside dict
        if neighbor in indexing:
            # check if neighbor is already displaying a number
            if indexing[neighbor] != 0:
                # if thats true, this Label should not
                # display any number
                return 0
    
    # if both neighors do not already display a number
    # a Label at this position is allowed
    return number


def removeLabel(page, index):
    """
    """
    page.evaluate("""(index) => {            
            document.querySelectorAll('[label_gnum="'+ index +'"]').forEach((node) => {
                    node.remove();                  
                  });
        }""", index)

def removeLabellink(page, index):
    """
    """
    page.evaluate("""(index) => {            
            document.querySelectorAll('line[start="'+ index +'"]').forEach((line)=>{
                if (line.getAttribute("link_type") == "label_link") {
                        line.remove();
                    }  
                });
 
        }""", index)

    
def highlightingRegion(page, v):
    """
    Highlight contiguous intermolecular basepair regions for both structures.

    Uses `getIntermolBasepairRegion` to identify the ranges of positions involved
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
    # [(start, end), (start, end)]
    basepair_region = getIntermolBasepairRegion(structure1, structure2)

    intermol_nodes = []
    for (start, end) in basepair_region:
        intermol_nodes += [i for i in range(start, end + 1, 1)]

    addStyleToNodes(page, intermol_nodes, "stroke: red;")


def addStyleToNodes(page, node_ids, style):
    page.evaluate("""([node_ids, style]) => {
            node_ids.forEach((node_id)=>{
                  document.querySelectorAll(`circle[node_num="${node_id}"]`).forEach((node)=>{
                        node.setAttribute("style", node.getAttribute("style") + style);
                     });
                  });
        }""", [node_ids, style])

def highlightSubsequence(page, v, seq):
    """Highlight a subsequence of nodes in the Fornac plot.

    Calculates the node range corresponding to the requested subsequence (using
    the provided start/end positions and sequence offsets), converts them to
    Fornac node IDs, and draws a translucent green polyline around those nodes.

    Args:
        page: Playwright-like page object used to evaluate JavaScript.
        v (dict): Dictionary containing keys:
            - "highlightSubseq1" / "highlightSubseq2" (tuple[int, int]): Start and end indices to highlight.
            - "offset1" / "offset2" (int): Offset used to map sequence positions to Fornac node indices.
            - "sequence1" (Sequence): First sequence (used to compute the shift for the second sequence).
        seq (str): Sequence identifier, "1" or "2", used to choose which highlight keys to read.

    Returns:
        None
    """
    key_highlightSubseq = f"highlightSubseq{seq}"
    key_startIndex = f"offset{seq}"

    for var in [key_highlightSubseq, key_startIndex, "sequence1"]:
        assert var in v

    # iterate through all subsequences
    for subsequence in v[key_highlightSubseq]:
        # translate start end index to position of nodes in fornac
        start, end = subsequence
        startIndex = v[key_startIndex]

        # startIndex ------> start --------> end -----> endIndex
        # [ -----distance1--->|---distance2 -->|-------------->]
        distance1 = start - startIndex
        distance2 = end - start

        # We dont use 0, therefore we need to take it out
        if startIndex < 0 and start > 0:
            distance1 -= 1
        if start < 0 and end > 0:
            distance2 -= 1

        # node id start with 1
        start_node = distance1 + 1
        end_node = distance1 + distance2 + 1

        # shift the calculation for the second sequence
        if seq == "2":
            shift = len(v["sequence1"]) + GAP
            start_node += shift
            end_node += shift

        indicies = list(range(start_node, end_node + 1))
        polyline(page, indicies, 
                        "stroke:purple;stroke-width:10;opacity:0.3;fill:None;" \
                        "stroke-linejoin: miter;stroke-miterlimit: 0.1;")


def polyline(page, indicies, style):  
    """Draw a styled polyline connecting a set of node positions in the Fornac plot.

    Calculates the x/y positions of each node identified by `indicies` by
    reading their SVG transform attributes, then creates an SVG `polyline`
    element with the supplied style and inserts it at the top of the plot.

    Args:
        page: Playwright-like page object used to evaluate JavaScript.
        indicies (Sequence[int]): Fornac node IDs to connect in order.
        style (str): CSS style string applied to the created polyline element.

    Returns:
        None
    """

    page.evaluate("""([indicies, style]) => {
            var pos_string = "";
            indicies.forEach((index)=>{
                  document.querySelectorAll(`g[num="n${index}"]`).forEach((node)=>{
                    const transform = node.getAttribute("transform");
                    const match = Array.from(transform.matchAll(/-?\d+(?:\.\d+)?/g));
                    pos_string += `${match[0]},${match[1]} `;
                    });
                  });
        
        var poly = document.createElement("polyline");
        poly.setAttribute("points", pos_string); 
        poly.setAttribute("style", style); 
        fornac_plot = document.getElementsByClassName("fornac-plot")[0];
        fornac_plot.insertBefore(poly, fornac_plot.firstChild);
        }""", [indicies, style])

    
def getIntermolBasepairRegion(structure1, structure2):
    """
    Determine contiguous intermolecular basepair regions for both structures.

    For each structure, identifies the range of positions involved in
    intermolecular basepairs using `listIntermolNodes`, converts from
    0-based to 1-based indexing, and adjusts the second structure's
    indices to Fornac's global coordinate system by adding an offset
    equal to the length of the first structure plus 3 (for separator nodes).

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
    offset = len(structure1) + GAP

    for structure,shift in [(structure1, 0), (structure2, offset)]:
        basepair_list = [index for (index,_) in listIntermolNodes(structure, shift)]
        if not basepair_list:
            return []
        # fornac starts counting nodes with 1 -> list index start with 0
        region = (basepair_list[0], basepair_list[-1])
        basepair_region += [region]


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
    split = len(v["sequence1"]) + 1
    # searches for all basepairs. if the bases are on both sides of the split, 
    # it is a intermolecular basepair. higlight those bases with a red circle


    page.evaluate("""(split) => {
        document.querySelectorAll('[link_type="basepair"]').forEach((link) => {
            var nodes = [link.getAttribute("start"), link.getAttribute("end")];
            // if not intermolecular basepair, ignore
            if (!(nodes[0] < split && nodes[1] > split)) {return;}
            // color basepair border red
            nodes.forEach((node_num) => {
                node = document.querySelector('circle[node_num="' + node_num + '"]');
                node.setAttribute("style", node.getAttribute("style") + "stroke: red;");
                });
            
        });
    }""", split)  


def removeSecondLink(page):
    """
    Remove duplicate basepair links from the DOM.

    Iterates through all basepair link elements and removes those where
    the first node ID is greater than the second node ID, effectively
    eliminating duplicate links that Fornac generates.

    Args:
        page: Playwright-like page object used to evaluate JavaScript.

    Returns:
        None
    """
    page.evaluate("""() => {
        document.querySelectorAll('[link_type="basepair"]').forEach((link) => {
            var nodes = [link.getAttribute("start"), link.getAttribute("end")];
            // only allow inter basepairs form seq1 to seq2
            if (Number(nodes[0]) > Number(nodes[1])){
                link.remove();
            } 
        });
    }""")


def removeNode(page, id):
    """Remove a node from the DOM by its ID.

    Args:
        page: Playwright-like page object used to evaluate JavaScript.
        id: The ID of the node to remove.

    Returns:
        None
    """
    page.evaluate("""(id) => {
        var list_of_nodes = document.querySelectorAll('[num="n' + id.toString() + '"]');
        list_of_nodes.forEach(node => {
            node.remove();
        }); 
    }""", id)

def removeArrow(page, id):
    """Remove the arrow element from a node by its ID.

    Args:
        page: Playwright-like page object used to evaluate JavaScript.
        id: The ID of the node from which to remove the arrow.

    Returns:
        None
    """
    page.evaluate("""(id) => {
        var list_of_nodes = document.querySelectorAll('[num="n' + id.toString() + '"]');
        list_of_nodes.forEach(node => {
            node.firstChild.remove();
        }); 
    }""", id)

def removeLink(page, start_id, end_id):
    """Remove a backbone link between two nodes.

    Args:
        page: Playwright-like page object used to evaluate JavaScript.
        start_id: The ID of the starting node of the link.
        end_id: The ID of the ending node of the link.

    Returns:
        None
    """
    page.evaluate("""(link_ids) => {
        document.querySelectorAll('[link_type="backbone"]').forEach((link) => {
            var nodes = link.getAttribute("start") + "," + link.getAttribute("end");
            if (nodes==link_ids){
                link.remove();
            } 
        });
    }""", f"{start_id},{end_id}")    

def removeDummyNodes(page, sequence: list):
    """Remove dummy nodes from the DOM based on sequence positions.

    Iterates through the provided sequence and removes nodes, arrows, and links
    for positions where the nucleotide is "." (dummy nodes), adjusting for
    Fornac's 1-based indexing.

    Args:
        page: Playwright-like page object used to evaluate JavaScript.
        sequence (list): Sequence list where "." indicates dummy nodes to remove.

    Returns:
        None
    """
    # fornac nodex start indexing with 1
    # enumerate starts with 0
    # beacuse the sequence also has a &
    # all indicies afterwards are shifted
    # the indexing is still correct
    for index, n in enumerate(sequence):
        if n == ".":
            removeLink(page, index, index + 1)
            removeArrow(page, index + 1)
            removeNode(page, index)


def visualiseBasepairStength(page, v):
    """
    Visualize basepair strength by styling G-U basepairs.

    Creates a sequence array aligned with Fornac's node IDs (including
    separator nodes) and applies a dashed stroke to basepair links
    representing G-U pairs, which are weaker than G-C or A-U pairs.

    Args:
        page: Playwright-like page object used to evaluate JavaScript.
        v (dict): Dictionary containing at least "sequence1" and "sequence2".

    Returns:
        None
    """
    assert "sequence_dict" in v
    sequence_dict = v["sequence_dict"]
    page.evaluate("""(sequence_dict) => {
        document.querySelectorAll('[link_type="basepair"]').forEach((link) => {
            l1 = sequence_dict[link.getAttribute("start")];
            l2 = sequence_dict[link.getAttribute("end")];
            if ((l1 == "G" && l2 == "U") || (l1 == "U" && l2 == "G")) {
                link.setAttribute("stroke-dasharray","1,1");     
            }
        });
    }""", sequence_dict)


def setLinksId(page):
    page.evaluate("""() => {
        var list_of_lines = document.querySelectorAll('line');
        list_of_lines.forEach(line => {
            // get the start and end node
            link = line.children[0].textContent.split(":")[1];
            var [start, end] = link.split("-").filter(Number);
            line.setAttribute("start", start.toString());
            line.setAttribute("end", end.toString());
                  
        }); 
    }""")

def setLabelsId(page):
    page.evaluate("""() => {
        var list_of_labels = document.querySelectorAll('g[num="n-1"]');
        list_of_labels.forEach((label, index) => {
            label.setAttribute("label_gnum", (index+1).toString());
            label.firstChild.setAttribute("label_num", (index+1).toString());
        }); 
    }""")

def updateLinkTooltips(page, v):

    updated_indicies = {str(key): str(index) for (key, (_, index)) in getIndexDictionary(v).items()}
    # TODO
    page.evaluate("""(updated_indicies) => {
        var list_of_lines = document.querySelectorAll('line');
        list_of_lines.forEach(line => {
            // get the start and end node
            var start = line.getAttribute("start");
            var end = line.getAttribute("end");

            if (line.getAttribute("link_type") == "label_link") {
                line.firstChild.textContent = updated_indicies[start];   
            } else {
                line.firstChild.textContent = updated_indicies[start] + "-" + updated_indicies[end];      
            }
        }); 
    }""", updated_indicies)


def backgroundhighlightingBasepairs(page, v):

    intermol_pairs = listIntermolPairs(v)
    if intermol_pairs == []:
        return
    stack = [intermol_pairs.pop(0)]
    highlightbackground = []
    for open, close in intermol_pairs:
        # check if stack, add on stack
        if (open-1, close+1) == stack[-1]:
            stack += [(open, close)]
            continue
        # if not, make new stack and safe the old one
        area = sorted([x for t in stack for x in t])
        highlightbackground += [area + [area[0]]]
        stack = [(open, close)]

    area = sorted([x for t in stack for x in t])
    highlightbackground += [area + [area[0]]]

    for stack in highlightbackground:
        polyline(page, stack, "fill:red;opacity:0.2;stroke:red;stroke-width:7")


def backgroundhighlightingRegion(page, v):
    """
    """
    for var in ["structure1", "structure2"]:
        assert var in v
    structure1 = v["structure1"]
    structure2 = v["structure2"]
    
    assert structure2 != ""
    # [(start, end), (start, end)]
    basepair_region = getIntermolBasepairRegion(structure1, structure2)

    intermol_nodes = []
    for (start, end) in basepair_region:
        intermol_nodes += [i for i in range(start, end + 1, 1)]
    
    polyline(page, intermol_nodes, "fill:red;opacity:0.2")



def listIntermolPairs(v):
    for var in ["structure_dict", "structure1", "structure2"]:
        assert var in v
    struc = v["structure_dict"]
    struc1 = v["structure1"]
    struc2 = v["structure2"]
    shift = len(struc1) + GAP

    intermol = {i: "." for i, _  in struc.items()}
    for index, bracket in listIntermolNodes(struc1) + listIntermolNodes(struc2, shift):
        intermol[index] = bracket
    
    return listBasepairs(intermol)


def listBasepairs(struc: dict):
    '''
    '''
    basepairs = []
    open_basepairs = {"(": [], "<": [], "[": [], "{": []}
    brackets = [("(",")"), ("[","]"), ("{", "}"), ("<",">")]
    for index, char in struc.items():
        for (open, close) in brackets:
            # check for open basepair, add to stack
            if char == open:
                open_basepairs[open] += [index]
                break               
            # check for close basepair, remove from stack
            # if stack empty, it is an intermolecular basepair
            if char == close:
                if open_basepairs[open]:
                    basepairs += [(open_basepairs[open].pop(), index)]
                break

    basepairs.sort()
    return basepairs

def showAccessibility(v, path, page):
    assert v["molecules"] == "2"

    sequence1 = v["sequence1"]
    sequence2 = v["sequence2"]
    offset1= 0
    offset2 = len(sequence1) + GAP
    RNAfold_parameters = v["RNAfold"]

    struc = v["structure_dict"]


    probabillity = {i: 0 for i, _  in struc.items()}




    for sequence, offset in [(sequence1, offset1), (sequence2, offset2)]:
        new_probabillity = calculateProbabilities(sequence, offset, path, RNAfold_parameters)
        probabillity.update(new_probabillity)
    
    
    for index, probabillity in probabillity.items():
        style = f"opacity: {1 - probabillity / 2}"
        addStyleToNodes(page, [index], style)

def calculateProbabilities(sequence, offset, path, RNAfold_parameters):

    runCommand(f"echo {sequence} | RNAfold -p --noPS {RNAfold_parameters}", "(.)")

    probabillity = {}

    
    try:
        with open(path, "r") as f:
            for match in re.findall("\d+ \d+ \d.\d+ ubox", f.read()):
                id1, id2, sqrt_string, _ = match.split()
                sqrt = float(sqrt_string)
                for id in (id1, id2):
                    dict_id = str(int(id) + offset)
                    if dict_id in probabillity:
                        probabillity[dict_id] += sqrt ** 2
                    else:
                        probabillity[dict_id] = sqrt ** 2
    except FileNotFoundError:
        raise FileNotFoundError
    
    # remove left over file
    runCommand(f"rm {path}", "($^)")

    
    return probabillity
