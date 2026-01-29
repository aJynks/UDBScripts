`#version 4`;

`#name Monster Closet - Chess - Tags`;

`#description Manages teleport tags for selected linedefs with walk-over teleport actions.`;

`#scriptoptions

mode
{
    description = "Mode";
    type = 11; // Enum
    default = 0;
    enumvalues {
        0 = "Mode 1";
        1 = "Mode 2";
        2 = "Mode 3";
    }
}

setTag
{
    description = "1 : Assign TAG (0 = auto-assign first unused)";
    type = 0; // Integer
    default = 0;
}

tagRange
{
    description = "2 : Assign TAG Range (e.g., 6-9 or 200-240)";
    type = 2; // String
    default = "";
}

groupStartTag
{
    description = "3 : Tag by Group - Starting Tag (0 = auto-assign)";
    type = 0; // Integer
    default = 0;
}

`;

// Convert any selection to linedefs
// If vertices or sectors are selected, get their linedefs
let selectedLinedefs = UDB.Map.getSelectedLinedefs();

// If no linedefs selected, try to get linedefs from selected vertices
if (selectedLinedefs.length === 0) {
    let selectedVertices = UDB.Map.getSelectedVertices();
    if (selectedVertices.length > 0) {
        // Get all linedefs that use these vertices
        let linedefSet = new Set();
        for (let vertex of selectedVertices) {
            let lines = vertex.getLinedefs();
            for (let ld of lines) {
                linedefSet.add(ld);
            }
        }
        selectedLinedefs = Array.from(linedefSet);
    }
}

// If still no linedefs, try to get linedefs from selected sectors
if (selectedLinedefs.length === 0) {
    let selectedSectors = UDB.Map.getSelectedSectors();
    if (selectedSectors.length > 0) {
        // Get all linedefs that belong to these sectors
        let linedefSet = new Set();
        for (let sector of selectedSectors) {
            let sidedefs = sector.getSidedefs();
            for (let sd of sidedefs) {
                linedefSet.add(sd.line);
            }
        }
        selectedLinedefs = Array.from(linedefSet);
    }
}

if (selectedLinedefs.length === 0) {
    UDB.showMessage("Error: No geometry selected.\nPlease select linedefs, vertices, or sectors with teleport actions.");
    UDB.die();
}

// Walk-over teleport action numbers
const TELEPORT_ACTIONS = [
    97,   // WR Teleport
    39,   // W1 Teleport
    125,  // W1 Teleport (monsters only)
    126,  // WR Teleport (monsters only)
    207,  // W1 Silent Teleport (MBF21)
    208,  // WR Silent Teleport (MBF21)
    243,  // W1 Teleport (line to line)
    244,  // WR Teleport (line to line)
    262, 263, 264, 265, 266, 267, 268, 269  // Additional teleports
];

// Filter to only linedefs with walk-over teleport actions
let teleportLinedefs = selectedLinedefs.filter(ld => 
    TELEPORT_ACTIONS.includes(ld.action)
);

if (teleportLinedefs.length === 0) {
    UDB.showMessage("Error: None of the selected linedefs have walk-over teleport actions.\nSelected " + selectedLinedefs.length + " linedefs, but none are teleports.");
    UDB.die();
}

// Get script options
let mode = UDB.ScriptOptions.mode;
let setTag = UDB.ScriptOptions.setTag;
let tagRange = UDB.ScriptOptions.tagRange;
let groupStartTag = UDB.ScriptOptions.groupStartTag;

// Execute based on mode
if (mode === 0) {
    // Mode 1: Set all to same tag
    let tagToUse = setTag;
    
    // If no tag entered (0), find first unused tag
    if (tagToUse === 0) {
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
        tagToUse = 1;
        while (usedTags.has(tagToUse)) {
            tagToUse++;
        }
    }
    
    for (let ld of teleportLinedefs) {
        ld.tag = tagToUse;
    }
    
    UDB.Map.clearAllSelected();
    UDB.showMessage(`Set ${teleportLinedefs.length} teleport linedefs to tag ${tagToUse}`);
    
} else if (mode === 1) {
    // Mode 2: Random tags from range
    
    // Parse the range string (e.g., "6-9" or "200-240")
    if (!tagRange || tagRange.trim() === "") {
        UDB.showMessage("Error: Please enter a tag range.\nExample: 6-9 or 200-240\n\nReceived value: '" + tagRange + "'");
        UDB.die();
    }
    
    let parts = tagRange.split("-");
    if (parts.length !== 2) {
        UDB.showMessage("Error: Invalid range format.\nPlease use format: MIN-MAX (e.g., 6-9 or 200-240)");
        UDB.die();
    }
    
    let randomMin = parseInt(parts[0].trim());
    let randomMax = parseInt(parts[1].trim());
    
    if (isNaN(randomMin) || isNaN(randomMax)) {
        UDB.showMessage("Error: Range values must be numbers.\nExample: 6-9 or 200-240");
        UDB.die();
    }
    
    if (randomMin > randomMax) {
        UDB.showMessage(`Error: Range minimum (${randomMin}) cannot be greater than maximum (${randomMax})`);
        UDB.die();
    }
    
    // Assign random tags
    for (let ld of teleportLinedefs) {
        let randomTag = Math.floor(Math.random() * (randomMax - randomMin + 1)) + randomMin;
        ld.tag = randomTag;
    }
    
    UDB.Map.clearAllSelected();
    UDB.showMessage(`Assigned random tags (${randomMin}-${randomMax}) to ${teleportLinedefs.length} teleport linedefs`);
    
} else if (mode === 2) {
    // Mode 3: Tag by Group - find connected groups of linedefs
    
    // Determine starting tag
    let currentTag = groupStartTag;
    if (currentTag === 0) {
        let usedTags = new Set();
        UDB.Map.getSectors().forEach(s => {
            if (s.tag > 0) usedTags.add(s.tag);
        });
        UDB.Map.getLinedefs().forEach(ld => {
            if (ld.tag > 0) usedTags.add(ld.tag);
        });
        currentTag = 1;
        while (usedTags.has(currentTag)) {
            currentTag++;
        }
    }
    
    // Group linedefs by connectivity
    let unprocessed = new Set(teleportLinedefs);
    let groups = [];
    
    while (unprocessed.size > 0) {
        // Start a new group with the first unprocessed linedef
        let currentGroup = [];
        let toProcess = [Array.from(unprocessed)[0]];
        
        while (toProcess.length > 0) {
            let ld = toProcess.pop();
            
            if (!unprocessed.has(ld)) continue;
            
            unprocessed.delete(ld);
            currentGroup.push(ld);
            
            // Find all connected linedefs (share a vertex)
            let startVertex = ld.start;
            let endVertex = ld.end;
            
            for (let otherLd of unprocessed) {
                if (otherLd.start === startVertex || otherLd.start === endVertex ||
                    otherLd.end === startVertex || otherLd.end === endVertex) {
                    toProcess.push(otherLd);
                }
            }
        }
        
        groups.push(currentGroup);
    }
    
    // Assign tags to each group
    for (let group of groups) {
        for (let ld of group) {
            ld.tag = currentTag;
        }
        currentTag++;
    }
    
    UDB.Map.clearAllSelected();
    UDB.showMessage(`Found ${groups.length} connected groups of teleport linedefs.\nTagged with tags ${groupStartTag === 0 ? 'starting from ' + (currentTag - groups.length) : 'from ' + groupStartTag} to ${currentTag - 1}`);
}