export default {
  format: 'vaRRI',
  version: 1,
  fields: {
    sequence: 'ACGAUCAUGUGGUUUAGAGCAUUUUCGACAGCAG&ACGAAAAAAAGAGCAGACAGUAG',
    structure: '..<<..<<...>>>>...((....(((...((..&............)))))..))..',
    startIndex1: '-6',
    startIndex2: '100',
    seqName1: 'blue RNA',
    seqName2: 'the target',
    cropping: '2',
    colorSeq1: '#add8e6',
    colorSeq2: '#f4bb44',
    coloring: 'strand',
    highlighting: 'region',
    backgroundhighlighting: 'basepairs',
    distinctBpTypes: true,
    profileData1: '# unpaired probabilities\n1 0.9\n2 0.7\n3 0.3\n4 0.1\n7 0.3\n8 0.7\n9 0.6',
    profileIdxRef1: '1',
    profileColor1: '#800080',
    profileColorRepresentsOne1: true,
    profileData2: '',
    profileIdxRef2: '1',
    profileColor2: '#ff0000',
    profileColorRepresentsOne2: false,
    forceLayout: false,
    forceLayoutFreeTails: false,
    forceLayoutPullCrossing: false,
    forceLayoutLinearStructure: false,
    forceLayoutLinearRRI: true,
    hideFooterAndHeader: false,
    colorRriNodes: '#ff0000',
    colorRriRegion: '#ff0000',
    colorBasepair: '#ff0000',
  },
  annotations: {
    pointMutations: [
      { sequence: '1', position: 20, replacement: 'G', color: '#338a29' },
      { sequence: '2', position: 115, replacement: 'C', color: '#1E1EE4' },
    ],
    subsequenceHighlights: [
      { sequence: '1', range: [[15, 18]], color: '#338A29', alpha: 1 },
      { sequence: '2', range: [[117, 118]], color: '#1E1EE4', alpha: 0.7 },
    ],
    regionHighlights: [
      { sequence1Range: [21, 25], sequence2Range: [113, 114], color: '#0D00FF', alpha: 0.2 },
    ],
    textAnnotations: [
      {
        text: 'blue RNA', sequenceNameFor: '1', bold: true, italic: false, size: 8, color: '#2891c8',
        position: { x: -200.7008741529051, y: 13.469304295038569 }, anchor: null,
      },
      {
        text: 'the target', sequenceNameFor: '2', bold: true, italic: false, size: 8, color: '#e8be17',
        position: { x: -200.57799194603135, y: -33.758161226681665 }, anchor: null,
      },
      {
        text: 'subsequence', sequenceNameFor: null, bold: true, italic: true, size: 8, color: '#56af3d',
        position: { x: -21.39257544906482, y: 47.81899107367843 }, anchor: null,
      },
      {
        text: 'annotation', sequenceNameFor: null, bold: true, italic: true, size: 8, color: '#56af3d',
        position: { x: -21.963319946538917, y: 62.08760351052973 }, anchor: null,
      },
      {
        text: 'region', sequenceNameFor: null, bold: false, italic: false, size: 8, color: '#8049ab',
        position: { x: -94.44787112574372, y: 36.40410112419755 }, anchor: null,
      },
      {
        text: 'annotation', sequenceNameFor: null, bold: false, italic: false, size: 8, color: '#8049ab',
        position: { x: -92.73563763332153, y: 47.81899107367843 }, anchor: null,
      },
      {
        text: 'point', sequenceNameFor: null, bold: true, italic: false, size: 8, color: '#0737de',
        position: { x: -61.66608138819855, y: -52.52624900153063 }, anchor: null,
      },
      {
        text: 'mutation', sequenceNameFor: null, bold: true, italic: false, size: 8, color: '#0737de',
        position: { x: -60.36931650324601, y: -41.50374747943411 }, anchor: null,
      },
      {
        text: 'indexing', sequenceNameFor: null, bold: false, italic: true, size: 8, color: '#ff0000',
        position: { x: -126.09563916228302, y: -45.965174958955686 }, anchor: null,
      },
      {
        text: 'probability', sequenceNameFor: null, bold: true, italic: false, size: 8, color: '#a8488b',
        position: { x: 100.16407087669964, y: -55.85866037891114 }, anchor: null,
      },
      {
        text: 'profile', sequenceNameFor: null, bold: true, italic: false, size: 8, color: '#a8488b',
        position: { x: 104.37348693340908, y: -40.64601818636274 }, anchor: null,
      },
      {
        text: 'sequence names', sequenceNameFor: null, bold: false, italic: false, size: 8, color: '#000000',
        position: { x: -200.6407749205137, y: -53.51437846108769 }, anchor: null,
      },
      {
        text: 'base-pair', sequenceNameFor: null, bold: false, italic: false, size: 8, color: '#ff0000',
        position: { x: 90.7051408510386, y: 25.763421748858548 }, anchor: null,
      },
      {
        text: 'types', sequenceNameFor: null, bold: false, italic: false, size: 8, color: '#ff0000',
        position: { x: 90.20965459972643, y: 38.15057803166269 }, anchor: null,
      },
      {
        text: 'linear RRI helices', sequenceNameFor: null, bold: false, italic: false, size: 8, color: '#ff8080',
        position: { x: -168.9296548365352, y: -8.425129591680786 }, anchor: null,
      },
    ],
  },
  rotation: 0,
  showRenderingOnly: false,
};
