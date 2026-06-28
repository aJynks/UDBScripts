`#version 4`;

`#name Monster Closet - Chess - SoundBox`;

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
    boundingSector.floorTexture = "CEIL4_1";
    boundingSector.ceilingTexture = "CEIL4_1";
    
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

// Set flags on external linedefs (already collected before creating bounding box)
for (let linedef of externalLinedefs) {
    // Set impassable flag (flag 1)
    linedef.flags["1"] = true;
    
    // Set block monsters flag (flag 2)
    linedef.flags["2"] = true;
}

// Assign the bounding-side LOWER and UPPER texture of every external wall based on
// what the structure sector is:
//   door  (sector is built closed: floor height == ceiling height) -> SHAWN2
//   floor flat FLOOR1_6                                             -> COMPBLUE
//   floor flat FLAT14                                               -> REDWALL
//   anything else (the monster box, etc.)                           -> COMPSPAN
// Door is checked first so it wins regardless of the door sector's floor flat.
// The door can't be told apart by texture (its door-face texture lives on shared
// divider lines that face *into* the box), so detection keys on it being the only
// sector built closed (floor == ceiling).
// Now that the bounding box is drawn, each external line is two-sided: one side
// is the structure sector, the other faces the new bounding sector. Assigned
// unconditionally so they're there for manual edits.

// Identify door sector(s): the door is built closed (floor == ceiling).
let doorSectorIndices = new Set();
for (let sector of selectedSectors) {
    if (sector.floorHeight === sector.ceilingHeight) {
        doorSectorIndices.add(sector.index);
    }
}

let texturedCount = 0;
for (let linedef of externalLinedefs) {
    let frontIsSelected = linedef.front && selectedSectors.includes(linedef.front.sector);
    let backIsSelected = linedef.back && selectedSectors.includes(linedef.back.sector);
    
    let structureSide = null;
    let boundingSide = null;
    
    if (frontIsSelected && !backIsSelected) {
        structureSide = linedef.front;
        boundingSide = linedef.back;
    } else if (backIsSelected && !frontIsSelected) {
        structureSide = linedef.back;
        boundingSide = linedef.front;
    }
    
    if (structureSide !== null && boundingSide !== null) {
        let wallTex = "COMPSPAN";

        if (doorSectorIndices.has(structureSide.sector.index)) {
            wallTex = "SHAWN2";                // door
        } else {
            let flat = structureSide.sector.floorTexture;
            if (flat === "FLOOR1_6") {
                wallTex = "COMPBLUE";
            } else if (flat === "FLAT14") {
                wallTex = "REDWALL";
            }
        }

        boundingSide.lowerTexture = wallTex;
        boundingSide.upperTexture = wallTex;
        texturedCount++;
    }
}

let width = Math.round(maxX - minX);
let height = Math.round(maxY - minY);

UDB.showMessage(`Created bounding box: ${width} x ${height}\nSet ${externalLinedefs.length} lines to impassable + block monsters\nTextured ${texturedCount} external lines, lower + upper (per flat / door)`);