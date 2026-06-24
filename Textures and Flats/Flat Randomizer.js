/// <reference path="../udbscript.d.ts" />

`#version 4`;

`#name Flat Randomizer`;

`#description Randomizes flats on selected sectors with multiple modes: use current flats, Doom2 only, custom resources only, all available flats, or a custom list. Can apply one random flat to all sectors or different random flats to each sector.`;

`#scriptoptions

edit_filter
{
    description = "Edit Filter (all modes)";
    type = 11;
    default = 0;
    enumvalues
    {
        0 = "Floor";
        1 = "Ceiling";
        2 = "Both";
    }
}

mode
{
    description = "Randomization mode";
    type = 11;
    default = 0;
    enumvalues
    {
        0 = "Mode 1: From Selection";
        1 = "Mode 2: From Doom2.wad";
        2 = "Mode 3: From Custom Resources";
        3 = "Mode 4: From All Resources";
        4 = "Mode 5: From List";
    }
}

custom_flat_list
{
    description = "Custom List (comma-separated, for Mode 5)";
    type = 2;
    default = "FLOOR0_1,FLOOR4_8,CEIL3_5";
}

selection_filter
{
    description = "Selection Filter (Mode 1)";
    type = 11;
    default = 2;
    enumvalues
    {
        0 = "Floor";
        1 = "Ceiling";
        2 = "Both";
    }
}

unified_random
{
    description = "Single Random Flat";
    type = 3;
    default = false;
}

linked
{
    description = "Linked (Cieling and Floor Identical)";
    type = 3;
    default = true;
}

`;

// Doom 2 flat list (complete list from IWAD)
const DOOM2_FLATS = [
    "BLOOD1", "BLOOD2", "BLOOD3",
    "CEIL1_1", "CEIL1_2", "CEIL1_3",
    "CEIL3_1", "CEIL3_2", "CEIL3_3", "CEIL3_4", "CEIL3_5", "CEIL3_6",
    "CEIL4_1", "CEIL4_2", "CEIL4_3",
    "CEIL5_1", "CEIL5_2",
    "COMP01",
    "CONS1_1", "CONS1_5", "CONS1_7",
    "CRATOP1", "CRATOP2",
    "DEM1_1", "DEM1_2", "DEM1_3", "DEM1_4", "DEM1_5", "DEM1_6",
    "FLAT1", "FLAT1_1", "FLAT1_2", "FLAT1_3",
    "FLAT2", "FLAT3",
    "FLAT4",
    "FLAT5", "FLAT5_1", "FLAT5_2",
    "FLAT5_3",
    "FLAT5_4", "FLAT5_5",
    "FLAT8",
    "FLAT9",
    "FLAT10",
    "FLAT14",
    "FLAT17",
    "FLAT18",
    "FLAT19",
    "FLAT20",
    "FLAT22",
    "FLAT23",
    "FLOOR0_1", "FLOOR0_2", "FLOOR0_3", "FLOOR0_5", "FLOOR0_6", "FLOOR0_7",
    "FLOOR1_1", "FLOOR1_7",
    "FLOOR3_3",
    "FLOOR4_1", "FLOOR4_5", "FLOOR4_6", "FLOOR4_8",
    "FLOOR5_1", "FLOOR5_2", "FLOOR5_3", "FLOOR5_4",
    "FLOOR6_1", "FLOOR6_2",
    "FLOOR7_1", "FLOOR7_2",
    "FWATER1", "FWATER2", "FWATER3", "FWATER4",
    "GATE1", "GATE2", "GATE3", "GATE4",
    "GRASS1", "GRASS2",
    "GRNLITE1",
    "GRNROCK",
    "LAVA1", "LAVA2", "LAVA3", "LAVA4",
    "MFLR8_1", "MFLR8_2", "MFLR8_3", "MFLR8_4",
    "NUKAGE1", "NUKAGE2", "NUKAGE3",
    "RROCK01", "RROCK02", "RROCK03", "RROCK04",
    "RROCK05", "RROCK06", "RROCK07", "RROCK08",
    "RROCK09", "RROCK10", "RROCK11", "RROCK12",
    "RROCK13", "RROCK14", "RROCK15", "RROCK16",
    "RROCK17", "RROCK18", "RROCK19", "RROCK20",
    "SLIME01", "SLIME02", "SLIME03", "SLIME04",
    "SLIME05", "SLIME06", "SLIME07", "SLIME08",
    "SLIME09", "SLIME10", "SLIME11", "SLIME12",
    "SLIME13", "SLIME14", "SLIME15", "SLIME16",
    "STEP1", "STEP2",
    "STONE", "STONE2", "STONE3",
    "TLITE6_1", "TLITE6_4", "TLITE6_5", "TLITE6_6",
    "F_SKY1"
];

/**
 * Get random element from array
 */
function getRandomElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Get the flat list based on the selected mode
 */
function getFlatList(mode) {
    const allFlats = UDB.Data.getFlatNames();
    
    switch(mode) {
        case 0: // Current flats from selected sectors
            const sectors = UDB.Map.getSelectedSectors();
            if (sectors.length === 0) {
                UDB.die('No sectors selected!');
            }
            
            const selectionFilter = UDB.ScriptOptions.selection_filter;
            const currentFlats = new Set();
            
            sectors.forEach(sector => {
                // Add floor textures if filter allows
                if (selectionFilter === 0 || selectionFilter === 2) { // Floor or Both
                    currentFlats.add(sector.floorTexture);
                }
                // Add ceiling textures if filter allows
                if (selectionFilter === 1 || selectionFilter === 2) { // Ceiling or Both
                    currentFlats.add(sector.ceilingTexture);
                }
            });
            
            return Array.from(currentFlats);
            
        case 1: // Doom2 flats only
            const doom2Flats = DOOM2_FLATS.filter(flat => UDB.Data.flatExists(flat));
            if (doom2Flats.length === 0) {
                UDB.die('No Doom2 flats found! Make sure doom2.wad is loaded.');
            }
            return doom2Flats;
            
        case 2: // Custom resource flats only
            const customFlats = allFlats.filter(flat => !DOOM2_FLATS.includes(flat));
            if (customFlats.length === 0) {
                UDB.die('No custom resource flats found! Load custom texture packs in your resources.');
            }
            return customFlats;
            
        case 3: // All available flats
            if (allFlats.length === 0) {
                UDB.die('No flats found in loaded resources!');
            }
            return allFlats;
            
        case 4: // Custom flat list
            const customList = UDB.ScriptOptions.custom_flat_list
                .split(',')
                .map(s => s.trim())
                .filter(s => s.length > 0);
            
            if (customList.length === 0) {
                UDB.die('Custom flat list is empty! Enter comma-separated flat names.');
            }
            
            // Validate that all flats exist
            const invalidFlats = customList.filter(flat => !UDB.Data.flatExists(flat));
            if (invalidFlats.length > 0) {
                UDB.die('Invalid flats in custom list: ' + invalidFlats.join(', '));
            }
            
            return customList;
            
        default:
            UDB.die('Invalid mode selected!');
    }
}

/**
 * Main execution
 */
function main() {
    // Get script options
    const editFilter = UDB.ScriptOptions.edit_filter;
    const mode = UDB.ScriptOptions.mode;
    const unifiedRandom = UDB.ScriptOptions.unified_random;
    const linked = UDB.ScriptOptions.linked;
    
    // Determine what to randomize based on edit filter
    const randomizeFloor = (editFilter === 0 || editFilter === 2); // Floor or Both
    const randomizeCeiling = (editFilter === 1 || editFilter === 2); // Ceiling or Both
    
    // Get selected sectors
    const sectors = UDB.Map.getSelectedSectors();
    if (sectors.length === 0) {
        UDB.die('No sectors selected!');
    }
    
    // Get flat list based on mode
    const flatList = getFlatList(mode);
    
    // Pre-select unified random flats if needed
    let unifiedFloorFlat = null;
    let unifiedCeilingFlat = null;
    
    if (unifiedRandom) {
        if (randomizeFloor && randomizeCeiling && linked) {
            // If both are randomized and linked, use same flat for both
            unifiedFloorFlat = unifiedCeilingFlat = getRandomElement(flatList);
        } else {
            if (randomizeFloor) {
                unifiedFloorFlat = getRandomElement(flatList);
            }
            if (randomizeCeiling) {
                unifiedCeilingFlat = getRandomElement(flatList);
            }
        }
    }
    
    // Apply randomization
    sectors.forEach(sector => {
        // If linked is true and both floor and ceiling are being randomized,
        // pick one random flat for this sector (unless unified random overrides)
        let linkedFlat = null;
        if (linked && !unifiedRandom && randomizeFloor && randomizeCeiling) {
            linkedFlat = getRandomElement(flatList);
        }
        
        if (randomizeFloor) {
            if (unifiedRandom) {
                sector.floorTexture = unifiedFloorFlat;
            } else if (linked && randomizeCeiling) {
                sector.floorTexture = linkedFlat;
            } else {
                sector.floorTexture = getRandomElement(flatList);
            }
        }
        
        if (randomizeCeiling) {
            if (unifiedRandom) {
                sector.ceilingTexture = unifiedCeilingFlat;
            } else if (linked && randomizeFloor) {
                sector.ceilingTexture = linkedFlat;
            } else {
                sector.ceilingTexture = getRandomElement(flatList);
            }
        }
    });
    
    // Build result message
    const modeNames = [
        'Mode 1: current selection',
        'Mode 2: Doom2.wad',
        'Mode 3: custom resources',
        'Mode 4: all available',
        'Mode 5: list'
    ];
    
    let message = `Randomized ${sectors.length} sector(s) using ${modeNames[mode]}`;
    message += ` (${flatList.length} flats available)`;
    
    if (unifiedRandom) {
        message += '\nUsed same random flat for all sectors';
        if (randomizeFloor && randomizeCeiling) {
            message += `\nFloor: ${unifiedFloorFlat}, Ceiling: ${unifiedCeilingFlat}`;
        } else if (randomizeFloor) {
            message += `\nFloor: ${unifiedFloorFlat}`;
        } else {
            message += `\nCeiling: ${unifiedCeilingFlat}`;
        }
    }
    
    UDB.showMessage(message);
}

main();