import subprocess
import re
import logging

def listIntermolNodes(struc: str, shift: int = 0) -> list[tuple[int, str]]:
    """Identify intermolecular basepair positions in a structure string.

    Analyzes a dot-bracket structure (without pseudoknots) and returns
    positions involved in intermolecular basepairs. Unmatched opening
    or closing brackets are considered intermolecular.

    Supports multiple bracket types independently: (), [], {}, <>.

    Args:
        struc (str): Structure string in dot-bracket notation.
        shift (int, optional): Offset added to each index. Defaults to 0.

    Returns:
        list[tuple[int, str]]: Sorted list of (index, bracket) pairs,
        where index is 1-based and includes the applied shift.

    For the following example Structures, the intermolecular basepairs are indicated with carets (^):s
    eg (())...((...(())  and (())...))...(())
    eg ((..(..)) and ((..)..))
       ^                     ^

    eg ((((...))... and ...))..
       ^^                  ^^
    eg ((<<...))... and ...>>..
         ^^                ^^
    """
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

def runCommand(command: str, expected_output: str) -> str:
    """Execute a shell command and extract expected output via regex.

    Runs the given command in a subprocess, captures stdout, and searches
    for a match using the provided regular expression. The regex must
    contain a capturing group, whose content will be returned.

    Args:
        command (str): Shell command to execute.
        expected_output (str): Regular expression with a capturing group
            to extract the desired output.

    Returns:
        str: The matched group from the command output.

    Raises:
        ValueError: If the command produces stderr output or if the
            expected pattern is not found in stdout.
    """
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
