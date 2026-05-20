`#version 4`;

`#name Chevron Closet - Sound Box`;

`#description Creates a bounding sector around selected sectors with a 64-unit buffer. Sets external lines to impassable and block monsters.`;

`#scriptoptions

bufferSize
{
    description = "Buffer size around selected sectors";
    type = 0; // Integer
    default = 64;
}

`;

// Get selected sectors
let selectedSectors = UDB.Map.getSelectedSectors();

if (selectedSectors.length === 0) {
    UDB.showMessage("Please select the monster closet sectors first!");
    UDB.die();
}

let bufferSize = UDB.ScriptOptions.bufferSize;

// Find the bounding box of all selected sectors
let minX = Infinity;
let minY = Infinity;
let maxX = -Infinity;
let maxY = -Infinity;

// Go through all vertices of selected sectors to find bounds
for (let sector of selectedSectors) {
    let sidedefs = sector.getSidedefs();
    for (let sidedef of sidedefs) {
        let linedef = sidedef.line;
        
        // Check start vertex
        if (linedef.start.position.x < minX) minX = linedef.start.position.x;
        if (linedef.start.position.y < minY) minY = linedef.start.position.y;
        if (linedef.start.position.x > maxX) maxX = linedef.start.position.x;
        if (linedef.start.position.y > maxY) maxY = linedef.start.position.y;
        
        // Check end vertex
        if (linedef.end.position.x < minX) minX = linedef.end.position.x;
        if (linedef.end.position.y < minY) minY = linedef.end.position.y;
        if (linedef.end.position.x > maxX) maxX = linedef.end.position.x;
        if (linedef.end.position.y > maxY) maxY = linedef.end.position.y;
    }
}

// First, find all "external" linedefs BEFORE creating the bounding box
// External linedefs are the outer edges of the selected sectors
let externalLinedefs = [];

for (let sector of selectedSectors) {
    let sidedefs = sector.getSidedefs();
    
    for (let sidedef of sidedefs) {
        let linedef = sidedef.line;
        
        // Check if this is an external line
        // A line is external if one side is our selected sector and the other side is NOT a selected sector
        let frontIsSelected = linedef.front && selectedSectors.includes(linedef.front.sector);
        let backIsSelected = linedef.back && selectedSectors.includes(linedef.back.sector);
        
        // External line: one side selected, other side not selected (or doesn't exist)
        if ((frontIsSelected && !backIsSelected) || (backIsSelected && !frontIsSelected)) {
            if (!externalLinedefs.includes(linedef)) {
                externalLinedefs.push(linedef);
            }
        }
    }
}

// Add buffer to the bounding box
minX -= bufferSize;
minY -= bufferSize;
maxX += bufferSize;
maxY += bufferSize;

// Draw the bounding box
let boundingBox = [
    [minX, minY],
    [maxX, minY],
    [maxX, maxY],
    [minX, maxY],
    [minX, minY]
];

UDB.Map.drawLines(boundingBox);

// Get the newly created sector (it will be marked)
let newSectors = UDB.Map.getMarkedSectors();
if (newSectors.length > 0) {
    let boundingSector = newSectors[0];
    
    // Set some properties for the bounding sector
    boundingSector.floorTexture = "FLOOR0_1";
    boundingSector.ceilingTexture = "CEIL1_1";
    
    // Copy floor/ceiling heights from one of the selected sectors
    if (selectedSectors.length > 0) {
        boundingSector.floorHeight = selectedSectors[0].floorHeight;
        boundingSector.ceilingHeight = selectedSectors[0].ceilingHeight;
    }
}

// Get the bounding box linedefs and set flags
let boundingLinedefs = UDB.Map.getMarkedLinedefs();
for (let ld of boundingLinedefs) {
    ld.flags["128"] = true; // Not shown on automap
}

// Find and texture door linedefs BEFORE joining (sectors get disposed after join)
// Door linedefs: back sidedef exists, back lower texture is set and is not FIREBLU2
for (let sector of selectedSectors) {
    let sidedefs = sector.getSidedefs();
    for (let sidedef of sidedefs) {
        let linedef = sidedef.line;
        if (linedef.back !== null) {
            let backLower = linedef.back.lowerTexture;
            if (backLower && backLower !== '-' && backLower !== 'FIREBLU2') {
                linedef.back.lowerTexture = 'FIREBLU2';
            }
        }
    }
}

// Find all door sectors: floorHeight === ceilingHeight within selected sectors
let doorSectors = selectedSectors.filter(s => s.floorHeight === s.ceilingHeight);

if (doorSectors.length > 1) {
    // Collect all door tags before joining
    let doorTags = doorSectors.map(s => s.tag).filter(t => t !== 0);
    let lowestTag = Math.min(...doorTags);

    // Join all door sectors into the first one
    UDB.Map.joinSectors(doorSectors);

    // The first sector in the array is the survivor after join
    let joinedDoor = doorSectors[0];
    joinedDoor.tag = lowestTag;

    // Find all linedefs with special 253 whose tag matches any of the other door tags
    let otherTags = doorTags.filter(t => t !== lowestTag);
    UDB.Map.getLinedefs().forEach(function(ld) {
        if (ld.action === 253 && otherTags.includes(ld.tag)) {
            ld.action = 0;
            ld.tag    = 0;
        }
    });
}

// Set flags on external linedefs (already collected before creating bounding box)
for (let linedef of externalLinedefs) {
    // Set impassable flag (flag 1)
    linedef.flags["1"] = true;
    
    // Set block monsters flag (flag 2)
    linedef.flags["2"] = true;
}

let width = Math.round(maxX - minX);
let height = Math.round(maxY - minY);

UDB.showMessage(`Created bounding box: ${width} x ${height}\nSet ${externalLinedefs.length} lines to impassable + block monsters`);