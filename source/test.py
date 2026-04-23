from utils import runCommand
RNAfoldcall = "RNAfold --noPS -C << EOF\nCGGCUCGCAACAGACCUAUUAGUUUUACGUAAUAUUUG\n.xx...................................\nEOF "

intra_structures = runCommand(RNAfoldcall, r"([\.()]+)")
print(intra_structures)

