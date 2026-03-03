`#version 4`;

`#name Copy Flats`;

`#description Copies floor and/or ceiling textures from the first half of selected sectors to the second half. Select an even number of sectors - the first half will be copied to the second half in order.`;

`#scriptoptions
copyMode
{
    description = "Copy Flats";
    default = 0;
    type = 11;
    enumvalues
    {
        0 = "Both";
        1 = "Floor only";
        2 = "Ceiling only";
    }
}
`;

// Get selected sectors
let sectors = UDB.Map.getSelectedSectors();

// Validate selection
if (sectors.length === 0) {
    UDB.showMessage('No sectors selected.\n\nPlease select an even number of sectors.');
    UDB.exit();
}

if (sectors.length % 2 !== 0) {
    UDB.showMessage('Odd number of sectors selected (' + sectors.length + ').\n\nPlease select an even number of sectors.');
    UDB.exit();
}

// Calculate split point
let splitPoint = sectors.length / 2;
let sourceSectors = sectors.slice(0, splitPoint);
let targetSectors = sectors.slice(splitPoint);

// Determine what to copy based on option
let copyFloor = (UDB.ScriptOptions.copyMode === 0 || UDB.ScriptOptions.copyMode === 1);
let copyCeiling = (UDB.ScriptOptions.copyMode === 0 || UDB.ScriptOptions.copyMode === 2);

// Copy flats
for (let i = 0; i < sourceSectors.length; i++) {
    let source = sourceSectors[i];
    let target = targetSectors[i];
    
    if (copyFloor) {
        target.floorTexture = source.floorTexture;
    }
    
    if (copyCeiling) {
        target.ceilingTexture = source.ceilingTexture;
    }
}

// Report results
let modeText = '';
if (UDB.ScriptOptions.copyMode === 0) modeText = 'floor and ceiling';
else if (UDB.ScriptOptions.copyMode === 1) modeText = 'floor';
else if (UDB.ScriptOptions.copyMode === 2) modeText = 'ceiling';

UDB.showMessage('Copied ' + modeText + ' textures from ' + sourceSectors.length + ' source sectors to ' + targetSectors.length + ' target sectors.');