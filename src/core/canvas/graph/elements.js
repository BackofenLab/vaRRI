/**
 * Secondary structure classification adapted from Fornac v1.0.1 rnagraph.js.
 * Apache-2.0; see LICENSE.txt and NOTICE.md. Explicit strand breaks replace
 * the original instance fields; classification otherwise retains its algorithm.
 */
const numberSort = (a, b) => a - b;

export function classifyElements(pt, level = 0, i = 1, j = pt[0], breaks = []) {
        /* Convert a pair table to a list of secondary structure
         * elements:
         *
         * [['s',1,[2,3]]
         *
         * The 's' indicates that an element can be a stem. It can also be
         * an interior loop ('i'), a hairpin loop ('h') or a multiloop ('m')
         *
         * The second number (1 in this case) indicates the depth or
         * how many base pairs have to be broken to get to this element.
         *
         * Finally, there is the list of nucleotides which are part of
         * of this element.
         */
        var elements = [];
        var u5 = [i-1];
        var u3 = [j+1];

        if (i > j)
            return [];

            //iterate over the unpaired regions on either side
            //this is either 5' and 3' unpaired if level == 0
            //or an interior loop or a multiloop
            for (; pt[i] === 0; i++) { u5.push(i); }
            for (; pt[j] === 0; j--) { u3.push(j); }

            if (i > j) {
                //hairpin loop or one large unpaired molecule
                u5.push(i);
                if (level === 0)
                    return [['e',level, u5.sort(numberSort)]];
                else {
                    // check to see if we have chain breaks due
                    // to multiple strands in the input
                    var external = false;
                    var left = [];
                    var right = [];
                    for (var k = 0; k < u5.length; k++) {
                        if (external)
                            right.push(u5[k]);
                        else
                            left.push(u5[k]);

                        if (breaks.indexOf(u5[k]) >= 0)
                            external = true;
                    }

                    if (external) {
                        return [['h',level, u5.sort(numberSort)]];
                    }
                    else
                        // if not, this is a simple hairpin loop
                        return [['h',level, u5.sort(numberSort)]];
                }
            }

            if (pt[i] != j) {
                //multiloop
                var m = u5;
                var k = i;

                // the nucleotide before and the starting nucleotide
                m.push(k);
                while (k <= j) {
                    // recurse into a stem
                    elements = elements.concat(classifyElements(pt, level, k, pt[k], breaks));

                    // add the nucleotides between stems
                    m.push(pt[k]);
                    k = pt[k] + 1;
                    for (; pt[k] === 0 && k <= j; k++) { m.push(k);}
                    m.push(k);
                }
                m.pop();
                m = m.concat(u3);

                if (m.length > 0) {
                    if (level === 0)
                        elements.push(['e', level, m.sort(numberSort)]);
                    else
                        elements.push(['m', level, m.sort(numberSort)]);
                }

                return elements;
            }

            if (pt[i] === j) {
                //interior loop
                u5.push(i);
                u3.push(j);

                var combined = u5.concat(u3);
                if (combined.length > 4) {
                    if (level === 0)
                        elements.push(['e',level, u5.concat(u3).sort(numberSort)]);
                    else
                        elements.push(['i',level, u5.concat(u3).sort(numberSort)]);
                }
            }

            var s = [];
            //go through the stem
            while (pt[i] === j && i < j) {
                //one stem
                s.push(i);
                s.push(j);

                i += 1;
                j -= 1;

                level += 1;
            }

            u5 = [i-1];
            u3 = [j+1];
            elements.push(['s', level, s.sort(numberSort)]);

        return elements.concat(classifyElements(pt, level, i, j, breaks));
}

