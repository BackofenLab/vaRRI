var container = new fornac.FornaContainer("#rna_ss", {'animation': false});

var options = {'structure': '((..((....)).(((....))).))',
                        'sequence': 'CGCUUCAUAUAAUCCUAAUGACCUAU'
};

container.addRNA(options.structure, options);