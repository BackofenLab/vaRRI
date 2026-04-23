import subprocess
import re
import logging

def listIntermolNodes(struc, shift=0):
    '''
    Return sorted indices of intermolecular basepairs in dot-bracket notation.

    Analyzes a secondary structure string (dot-bracket notation, no pseudoknots)
    and returns a sorted list of 1-based indices that belong to intermolecular
    basepairs. Opening/closing parentheses "()" and angle brackets "<>" are
    handled independently: unmatched opens at the end or unmatched closes are
    considered intermolecular.

    Args:
        struc (str): Structure string in dot-bracket notation.

    Returns:
        list[int]: Sorted indices (0-based) of positions that are part of intermolecular basepairs.

    Example:
        >>> listIntermolNodes("((..))..))")
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
    for index, char in enumerate(struc, 1):
        for (open, close) in basepairs:
            # check for open basepair, add to stack
            if char == open:
                open_basepairs[open] += [(index+shift, char)]
                break               
            # check for close basepair, remove from stack
            # if stack empty, it is an intermolecular basepair
            if char == close:
                if open_basepairs[open]:
                    open_basepairs[open].pop()
                else:
                    inter_basepairs += [(index+shift, char)]
                break

    # all remaining open basepairs in the stack are intermolecular
    for pairs in open_basepairs.values():
        inter_basepairs += pairs

    inter_basepairs.sort()
    return inter_basepairs

def runCommand(command, expected_output):
    # expected output must be inside a group
    logging.info("------------- Systemcall -------------\n" +  command)
    result = subprocess.run(command, capture_output=True, text=True, shell=True)
    std_out = result.stdout.strip()
    std_err = result.stderr
    if std_err:
        raise ValueError("System Call returned Error. \n" +
                         f"------------- Command    -------------\n" + 
                         f"{command} \n"
                         f"------------- Output     -------------\n" +
                         f"{std_err}")


    structure_match = re.search(expected_output, std_out)
    if structure_match:
        logging.info(f"------------- Output     -------------\n" + std_out)
        return structure_match.group(1)
    else:
        raise ValueError("System Call didnt return expected output: \n" +
                         f"------------- Command    -------------\n" + 
                         f"{command} \n"
                         f"------------- Output     -------------\n" +
                         f"{std_out}")
