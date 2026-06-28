`#version 4`;

`#name Monster Closet Creator`;

`#description Creates a checkerboard-style monster closet at the mouse cursor position.`;

`#scriptoptions

monsterType
{
    description = "Monster EdNum (e.g., 3005 for Cacodemon)";
    type = 18; // Thing type picker
    default = 3005; // Cacodemon
}

thingWidth
{
    description = "Thing Width";
    type = 0; // Integer
    default = 62;
}

thingHeight
{
    description = "Thing Height";
    type = 0; // Integer
    default = 56;
}

monsterCount
{
    description = "Number of Monsters";
    type = 0; // Integer
    default = 8;
}

floorHeight
{
    description = "Monster Sector Floor Height";
    type = 0; // Integer
    default = 0;
}

teleportTag
{
    description = "Teleport Tag (0 = auto-assign next unused)";
    type = 0; // Integer
    default = 0;
}

`;

// Get the mouse position and snap to grid
let mousePos = UDB.Map.mousePosition;
let startPos = UDB.Map.snappedToGrid(mousePos);

// Get script options
let monsterType = UDB.ScriptOptions.monsterType;
let thingWidth = UDB.ScriptOptions.thingWidth;
let thingHeight = UDB.ScriptOptions.thingHeight;
let monsterCount = UDB.ScriptOptions.monsterCount;
let floorHeight = UDB.ScriptOptions.floorHeight;
let teleportTag = UDB.ScriptOptions.teleportTag;

// Round dimensions up to nearest multiple of 16
function roundTo16(value) {
    return Math.ceil(value / 16) * 16;
}

// Calculate sector dimensions (round up to expression of 16)
// Sectors should be SQUARE based on the larger dimension
let largerDimension = Math.max(thingWidth, thingHeight);
let sectorSize = roundTo16(largerDimension);
let sectorWidth = sectorSize;
let sectorHeight = sectorSize;
let ceilingHeight = floorHeight + thingHeight + 2;

// Calculate the space sector floor height (floor + 32)
let spaceFloorHeight = floorHeight + 32;

// If teleport tag is 0, find next unused tag
if (teleportTag === 0) {
    let usedTags = new Set();
    
    // Collect all used tags from sectors
    UDB.Map.getSectors().forEach(s => {
        if (s.tag > 0) usedTags.add(s.tag);
    });
    
    // Collect all used tags from linedefs
    UDB.Map.getLinedefs().forEach(ld => {
        if (ld.tag > 0) usedTags.add(ld.tag);
    });
    
    // Find next unused tag starting from 1
    teleportTag = 1;
    while (usedTags.has(teleportTag)) {
        teleportTag++;
    }
}

// Calculate checkerboard dimensions
function findBestGrid(monsterCount) {
    let bestCols = 0;
    let bestRows = 0;
    let bestWaste = Infinity;
    
    let minDimension = Math.ceil(Math.sqrt(monsterCount));
    
    for (let testCols = minDimension; testCols <= monsterCount + 2; testCols++) {
        for (let testRows = minDimension; testRows <= monsterCount + 2; testRows++) {
            if (testCols % 2 !== 0) continue;
            if (testRows % 2 !== 0) continue;
            
            let totalCells = testCols * testRows;
            let monsterPositions = Math.floor(totalCells / 2);
            
            if (monsterPositions < monsterCount) continue;
            
            let waste = totalCells - (monsterCount * 2);
            let squareness = Math.abs(testCols - testRows);
            let totalWaste = waste + (squareness * 0.1);
            
            if (totalWaste < bestWaste) {
                bestWaste = totalWaste;
                bestCols = testCols;
                bestRows = testRows;
            }
        }
    }
    
    return { cols: bestCols, rows: bestRows };
}

let gridSize = findBestGrid(monsterCount);
let cols = gridSize.cols;
let rows = gridSize.rows;

// If the grid is taller than it is wide, swap dimensions to make it landscape
if (rows > cols) {
    let temp = cols;
    cols = rows;
    rows = temp;
}

// Clear any existing marks
UDB.Map.clearAllMarks();

// Arrays to store sectors by type
let monsterSectorsList = [];
let spaceSectorsList = [];

// Track which cells have monsters in checkerboard pattern
let monstersPlaced = 0;

// Create the entire checkerboard grid
for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
        let cellX = startPos.x + (col * sectorWidth);
        let cellY = startPos.y - (row * sectorHeight);
        
        let sector = createSectorBox(cellX, cellY, sectorWidth, sectorHeight);
        
        if (sector !== null) {
            let isMonsterPosition = (row + col) % 2 === 0;
            
            if (isMonsterPosition && monstersPlaced < monsterCount) {
                sector.ceilingTexture = "CEIL3_3";
                sector.floorTexture = "CEIL3_3";
                sector.ceilingHeight = ceilingHeight;
                sector.floorHeight = floorHeight;
                monsterSectorsList.push(sector);
                
                let monsterPos = new UDB.Vector2D(
                    cellX + sectorWidth / 2,
                    cellY - sectorHeight / 2
                );
                let randomAngles = [0, 90, 180, 270];
                let randomAngle = randomAngles[Math.floor(Math.random() * 4)];
                let thing = UDB.Map.createThing(monsterPos, monsterType);
                thing.angle = randomAngle;
                
                monstersPlaced++;
            } else {
                sector.ceilingTexture = "CEIL4_1";
                sector.floorTexture = "CEIL4_1";
                sector.ceilingHeight = ceilingHeight;
                sector.floorHeight = spaceFloorHeight;
                spaceSectorsList.push(sector);
            }
        }
    }
}

// Merge sectors
if (monsterSectorsList.length > 1) {
    UDB.Map.mergeSectors(monsterSectorsList);
}

if (spaceSectorsList.length > 1) {
    UDB.Map.mergeSectors(spaceSectorsList);
}

// Merge overlapping vertices
let allVertices = UDB.Map.getVertices();
let vertexMap = new Map();

for (let vertex of allVertices) {
    let x = Math.round(vertex.position.x);
    let y = Math.round(vertex.position.y);
    let key = `${x},${y}`;
    if (!vertexMap.has(key)) {
        vertexMap.set(key, []);
    }
    vertexMap.get(key).push(vertex);
}

for (let [key, vertices] of vertexMap) {
    if (vertices.length > 1) {
        let keepVertex = vertices[0];
        for (let i = 1; i < vertices.length; i++) {
            vertices[i].join(keepVertex);
        }
    }
}

// Find teleport lines
let allLinedefsInMap = UDB.Map.getLinedefs();
let teleportLines = [];

for (let ld of allLinedefsInMap) {
    if (ld.back !== null && ld.front !== null) {
        let frontFloor = ld.front.sector.floorTexture;
        let backFloor = ld.back.sector.floorTexture;
        
        if ((frontFloor === "CEIL3_3" && backFloor === "CEIL4_1") ||
            (frontFloor === "CEIL4_1" && backFloor === "CEIL3_3")) {
            teleportLines.push(ld);
        }
    }
}

// Apply teleport action and tag
for (let ld of teleportLines) {
    ld.action = 97;
    ld.tag = teleportTag;
}

// Now fix linedef directions for monster squares
// After merging, find each monster square and make sure all linedefs face inward
let allThings = UDB.Map.getThings();
let ourMonsters = allThings.filter(t => t.type === monsterType);

for (let monster of ourMonsters) {
    let monsterPos = monster.position;
    
    // Find the 4 closest teleport linedefs (the square around this monster)
    let closestLinedefs = [];
    
    for (let ld of teleportLines) {
        let lineCenter = ld.getCenterPoint();
        let dist = Math.sqrt(
            Math.pow(lineCenter.x - monsterPos.x, 2) + 
            Math.pow(lineCenter.y - monsterPos.y, 2)
        );
        closestLinedefs.push({linedef: ld, distance: dist});
    }
    
    // Sort by distance and take the closest 4
    closestLinedefs.sort((a, b) => a.distance - b.distance);
    let squareLines = closestLinedefs.slice(0, 4);
    
    // For each line, make sure the front sector is the monster sector (CEIL3_3)
    for (let item of squareLines) {
        let ld = item.linedef;
        
        if (ld.front && ld.back) {
            let frontTexture = ld.front.sector.floorTexture;
            let backTexture = ld.back.sector.floorTexture;
            
            // Front should be monster sector (CEIL3_3)
            // If front is space (CEIL4_1) and back is monster (CEIL3_3), flip it
            if (frontTexture === "CEIL4_1" && backTexture === "CEIL3_3") {
                ld.flip();
            }
        }
    }
}

// Apply COMPSPAN to the lower of each step wall (CEIL3_3 <-> CEIL4_1 boundary).
// Front faces the monster pit (CEIL3_3) - the only side the lower texture renders on.
for (let ld of teleportLines) {
    if (ld.front && ld.back) {
        if (ld.front.sector.floorTexture === "CEIL4_1" && ld.back.sector.floorTexture === "CEIL3_3") {
            ld.flip();
        }
        ld.front.lowerTexture = "COMPSPAN";
    }
}

// Calculate total closet dimensions
let totalWidth = cols * sectorSize;
let totalHeight = rows * sectorSize;

// Build the output message
let message = `Monsters        : ${monsterCount}\n`;
message += `Teleport Tag    : ${teleportTag}\n`;
message += `Monster Closet  : ${totalWidth} x ${totalHeight}`;

UDB.showMessage(message);

function createSectorBox(x, y, width, height) {
    let coords = [
        [x, y],
        [x + width, y],
        [x + width, y - height],
        [x, y - height],
        [x, y]
    ];
    
    UDB.Map.drawLines(coords);
    
    let markedSectors = UDB.Map.getMarkedSectors();
    
    if (markedSectors.length > 0) {
        markedSectors[0].marked = false;
        return markedSectors[0];
    }
    
    return null;
}