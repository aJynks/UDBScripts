/// <reference path="../udbscript.d.ts" />

`#version 4`;

`#name Wall Randomizer`;

`#description Randomizes wall textures on selected linedefs with multiple modes: use current textures, Doom2 only, custom resources only, all available textures, or a custom list. Can randomize upper, middle, and/or lower textures and set unpegged flags.`;

`#scriptoptions

randomize_upper
{
    description = "Upper";
    type = 11;
    default = 0;
    enumvalues
    {
        0 = "Skip";
        1 = "Edit";
        2 = "Clear";
    }
}

randomize_middle
{
    description = "Middle";
    type = 11;
    default = 1;
    enumvalues
    {
        0 = "Skip";
        1 = "Edit";
        2 = "Clear";
    }
}

randomize_lower
{
    description = "Lower";
    type = 11;
    default = 0;
    enumvalues
    {
        0 = "Skip";
        1 = "Edit";
        2 = "Clear";
    }
}

unpegged_mode
{
    description = "Unpegged Flags";
    type = 11;
    default = 0;
    enumvalues
    {
        0 = "Default (no change)";
        1 = "Upper unpegged";
        2 = "Lower unpegged";
        3 = "Both unpegged";
    }
}

mode
{
    description = "Mode";
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

custom_texture_list
{
    description = "Custom List (comma-separated, for Mode 5)";
    type = 2;
    default = "STARTAN3,STARG3,BRONZE1";
}

unified_random
{
    description = "Single Random Textures";
    type = 3;
    default = false;
}

linked
{
    description = "Linked (Uper, Mid, Lower Identical";
    type = 3;
    default = true;
}

`;

// Doom 2 texture list (wall textures from IWAD)
const DOOM2_TEXTURES = [
    "BIGDOOR1", "BIGDOOR2", "BIGDOOR3", "BIGDOOR4",
    "BLAKWAL1", "BLAKWAL2",
    "BFALL1", "BFALL2", "BFALL3", "BFALL4",
    "BLODRIP1", "BLODRIP2", "BLODRIP3", "BLODRIP4",
    "BLODGR1", "BLODGR2", "BLODGR3", "BLODGR4",
    "BRONZE1", "BRONZE2", "BRONZE3", "BRONZE4",
    "BROWN1", "BROWN96", "BROWN144", "BROWNGRN", "BROWNHUG", "BROWNPIP",
    "BRNBIGC", "BRNBIGL", "BRNBIGR", "BRNSMAL1", "BRNSMAL2", "BRNSMALC", "BRNSMALL", "BRNSMALR",
    "BRNPOIS", "BRNPOIS2",
    "BRNTIL1", "BRNTIL2",
    "CEMENT1", "CEMENT2", "CEMENT3", "CEMENT4", "CEMENT5", "CEMENT6", "CEMENT7", "CEMENT8", "CEMENT9",
    "COMP2", "COMPBLUE", "COMPOHSO", "COMPSPAN", "COMPSTA1", "COMPSTA2", "COMPTALL", "COMPTILE", "COMPWERD",
    "CRACKLE2", "CRACKLE4",
    "CRATE1", "CRATE2", "CRATE3", "CRATINY", "CRATWIDE", "CRATELIT", "CRATEVNT",
    "DBRAIN1", "DBRAIN2", "DBRAIN3", "DBRAIN4",
    "DOOR1", "DOOR3",
    "DOORBLU", "DOORBLU2", "DOORRED", "DOORRED2", "DOORYEL", "DOORYEL2",
    "DOORTRAK", "DOORSTOP",
    "EXITDOOR", "EXITSIGN", "EXITSTON",
    "FIREBLU1", "FIREBLU2", "FIREWALA", "FIREWALB", "FIREWALL",
    "GRAY1", "GRAY2", "GRAY4", "GRAY5", "GRAY7", "GRAYBIG", "GRAYPOIS", "GRAYTALL", "GRAYVINE",
    "GSTONE1", "GSTONE2", "GSTFONT1", "GSTFONT2", "GSTFONT3", "GSTGARG", "GSTLION", "GSTSAT1", "GSTSATYR",
    "ICKDOOR1", "ICKWALL1", "ICKWALL2", "ICKWALL3", "ICKWALL4", "ICKWALL5", "ICKWALL6", "ICKWALL7",
    "LITE3", "LITE4", "LITE5", "LITE96", "LITE2", "LITEMET", "LITESTON",
    "MARBLE1", "MARBLE2", "MARBLE3", "MARBLOD1",
    "METAL1", "METAL2", "METAL3", "METAL4", "METAL5", "METAL6", "METAL7",
    "MIDBARS1", "MIDBARS3", "MIDBRONZ", "MIDGRATE", "MIDSPACE", "MIDVINE1", "MIDVINE2",
    "MODWALL1", "MODWALL2", "MODWALL3", "MODWALL4",
    "NUKE24", "NUKESLAD", "NUKEDGE1",
    "PANBLACK", "PANBLUE", "PANBOOK", "PANBORD1", "PANBORD2", "PANCASE1", "PANCASE2", "PANEL1", "PANEL2", "PANEL3",
    "PANEL4", "PANEL5", "PANEL6", "PANEL7", "PANEL8", "PANEL9",
    "PIPE1", "PIPE2", "PIPE4", "PIPE6",
    "PLANET1",
    "ROCK1", "ROCK2", "ROCK3", "ROCK4", "ROCK5",
    "ROCKRED1", "ROCKRED2", "ROCKRED3",
    "SCWALL", "SHAWN1", "SHAWN2", "SHAWN3", "SILVER1", "SILVER2", "SILVER3",
    "SKIN2", "SKINBORD", "SKINCUT", "SKINEDGE", "SKINFACE", "SKINLOW", "SKINMET1", "SKINMET2", "SKINSCAB", "SKINSYMB", "SKINSYM1", "SKINSYM2", "SKSNAKE1", "SKSNAKE2", "SKSPINE1", "SKSPINE2", "SKTTEK1", "SKTTEK2", "SKTTEK3",
    "SP_DUDE1", "SP_DUDE2", "SP_DUDE3", "SP_DUDE4", "SP_DUDE5", "SP_DUDE6", "SP_DUDE7", "SP_DUDE8",
    "SP_FACE1", "SP_FACE2", "SP_HOT1",
    "SP_ROCK1", "SP_ROCK2",
    "STARTAN1", "STARTAN2", "STARTAN3",
    "STARBR2", "STARG1", "STARG2", "STARG3", "STARGR1", "STARGR2",
    "STEP1", "STEP2", "STEP3", "STEP4", "STEP5", "STEP6",
    "STONE", "STONE2", "STONE3", "STONE4", "STONE5", "STONE6", "STONE7",
    "STUCCO", "STUCCO1", "STUCCO2", "STUCCO3",
    "SUPPORT2", "SUPPORT3",
    "SW1BRIK", "SW1BRN1", "SW1BRN2", "SW1BRNGN", "SW1BROWN", "SW1COMM", "SW1COMP", "SW1DIRT", "SW1EXIT",
    "SW1GARG", "SW1GRAY", "SW1GRAY1", "SW1GSTON", "SW1HOT", "SW1LION", "SW1MARB", "SW1MET2", "SW1METAL",
    "SW1MOD1", "SW1PANEL", "SW1PIPE", "SW1ROCK", "SW1SATYR", "SW1SKIN", "SW1SKULL", "SW1SLAD", "SW1STARG",
    "SW1STON1", "SW1STON2", "SW1STON6", "SW1STONE", "SW1STRTN", "SW1TEK", "SW1VINE", "SW1WDMET", "SW1WOOD", "SW1ZIM",
    "SW2BRIK", "SW2BRN1", "SW2BRN2", "SW2BRNGN", "SW2BROWN", "SW2COMM", "SW2COMP", "SW2DIRT", "SW2EXIT",
    "SW2GARG", "SW2GRAY", "SW2GRAY1", "SW2GSTON", "SW2HOT", "SW2LION", "SW2MARB", "SW2MET2", "SW2METAL",
    "SW2MOD1", "SW2PANEL", "SW2PIPE", "SW2ROCK", "SW2SATYR", "SW2SKIN", "SW2SKULL", "SW2SLAD", "SW2STARG",
    "SW2STON1", "SW2STON2", "SW2STON6", "SW2STONE", "SW2STRTN", "SW2TEK", "SW2VINE", "SW2WDMET", "SW2WOOD", "SW2ZIM",
    "TANROCK2", "TANROCK3", "TANROCK4", "TANROCK5", "TANROCK7", "TANROCK8",
    "TEKBRON1", "TEKBRON2", "TEKGREN1", "TEKGREN2", "TEKGREN3", "TEKGREN4", "TEKGREN5",
    "TEKLITE", "TEKLITE2",
    "TEKWALL1", "TEKWALL2", "TEKWALL3", "TEKWALL4", "TEKWALL5", "TEKWALL6",
    "WOOD1", "WOOD3", "WOOD4", "WOOD5", "WOOD6", "WOOD7", "WOOD8", "WOOD9", "WOOD10", "WOOD12",
    "WOODGARG", "WOODMET1", "WOODMET2", "WOODMET3", "WOODMET4", "WOODVERT",
    "ZELDOOR", "ZIMMER1", "ZIMMER2", "ZIMMER3", "ZIMMER4", "ZIMMER5", "ZIMMER7", "ZIMMER8",
    "ZZWOLF1", "ZZWOLF2", "ZZWOLF3", "ZZWOLF4", "ZZWOLF5", "ZZWOLF6", "ZZWOLF7", "ZZWOLF9", "ZZWOLF10", "ZZWOLF11", "ZZWOLF12", "ZZWOLF13",
    "-", "AASHITTY", "AASTINKY"
];

/**
 * Get random element from array
 */
function getRandomElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Get the texture list based on the selected mode
 */
function getTextureList(mode) {
    const allTextures = UDB.Data.getTextureNames();
    
    switch(mode) {
        case 0: // Current textures from selected linedefs
            const linedefs = UDB.Map.getSelectedLinedefs();
            if (linedefs.length === 0) {
                UDB.die('No linedefs selected!');
            }
            
            const currentTextures = new Set();
            linedefs.forEach(ld => {
                if (ld.front) {
                    if (ld.front.upperTexture !== '-') currentTextures.add(ld.front.upperTexture);
                    if (ld.front.middleTexture !== '-') currentTextures.add(ld.front.middleTexture);
                    if (ld.front.lowerTexture !== '-') currentTextures.add(ld.front.lowerTexture);
                }
                if (ld.back) {
                    if (ld.back.upperTexture !== '-') currentTextures.add(ld.back.upperTexture);
                    if (ld.back.middleTexture !== '-') currentTextures.add(ld.back.middleTexture);
                    if (ld.back.lowerTexture !== '-') currentTextures.add(ld.back.lowerTexture);
                }
            });
            
            return Array.from(currentTextures);
            
        case 1: // Doom2 textures only
            const doom2Textures = DOOM2_TEXTURES.filter(tex => UDB.Data.textureExists(tex));
            if (doom2Textures.length === 0) {
                UDB.die('No Doom2 textures found! Make sure doom2.wad is loaded.');
            }
            return doom2Textures;
            
        case 2: // Custom resource textures only
            const customTextures = allTextures.filter(tex => !DOOM2_TEXTURES.includes(tex));
            if (customTextures.length === 0) {
                UDB.die('No custom resource textures found! Load custom texture packs in your resources.');
            }
            return customTextures;
            
        case 3: // All available textures
            if (allTextures.length === 0) {
                UDB.die('No textures found in loaded resources!');
            }
            return allTextures;
            
        case 4: // Custom texture list
            const customList = UDB.ScriptOptions.custom_texture_list
                .split(',')
                .map(s => s.trim())
                .filter(s => s.length > 0);
            
            if (customList.length === 0) {
                UDB.die('Custom texture list is empty! Enter comma-separated texture names.');
            }
            
            // Validate that all textures exist
            const invalidTextures = customList.filter(tex => !UDB.Data.textureExists(tex));
            if (invalidTextures.length > 0) {
                UDB.die('Invalid textures in custom list: ' + invalidTextures.join(', '));
            }
            
            return customList;
            
        default:
            UDB.die('Invalid mode selected!');
    }
}

/**
 * Apply unpegged flags to a linedef based on mode
 */
function applyUnpeggedFlags(linedef, mode) {
    // Flag values for Doom format
    const UPPER_UNPEGGED = 8;
    const LOWER_UNPEGGED = 16;
    
    switch(mode) {
        case 0: // Default - no change
            break;
            
        case 1: // Upper unpegged
            linedef.flags['8'] = true;
            break;
            
        case 2: // Lower unpegged
            linedef.flags['16'] = true;
            break;
            
        case 3: // Both unpegged
            linedef.flags['8'] = true;
            linedef.flags['16'] = true;
            break;
    }
}

/**
 * Main execution
 */
function main() {
    // Get script options
    const upperMode = UDB.ScriptOptions.randomize_upper; // 0=Skip, 1=Edit, 2=Clear
    const middleMode = UDB.ScriptOptions.randomize_middle;
    const lowerMode = UDB.ScriptOptions.randomize_lower;
    const unpeggedMode = UDB.ScriptOptions.unpegged_mode;
    const mode = UDB.ScriptOptions.mode;
    const unifiedRandom = UDB.ScriptOptions.unified_random;
    
    // Get selected linedefs
    const linedefs = UDB.Map.getSelectedLinedefs();
    if (linedefs.length === 0) {
        UDB.die('No linedefs selected!');
    }
    
    // Get texture list based on mode (only if at least one part is set to Edit)
    let textureList = null;
    if (upperMode === 1 || middleMode === 1 || lowerMode === 1) {
        textureList = getTextureList(mode);
    }
    
    // Pre-select unified random textures if needed
    let unifiedUpperTexture = null;
    let unifiedMiddleTexture = null;
    let unifiedLowerTexture = null;
    
    if (unifiedRandom && textureList) {
        if (upperMode === 1) {
            unifiedUpperTexture = getRandomElement(textureList);
        }
        if (middleMode === 1) {
            unifiedMiddleTexture = getRandomElement(textureList);
        }
        if (lowerMode === 1) {
            unifiedLowerTexture = getRandomElement(textureList);
        }
    }
    
    // Apply randomization
    let processedCount = 0;
    const linked = UDB.ScriptOptions.linked;
    
    linedefs.forEach(ld => {
        // If linked is true, pick one random texture for this linedef
        // (unless unified random is also true, which overrides everything)
        let linkedTexture = null;
        if (linked && !unifiedRandom && textureList) {
            linkedTexture = getRandomElement(textureList);
        }
        
        // Helper function to get the appropriate texture
        const getTexture = (mode) => {
            if (mode !== 1) return null; // Only matters for Edit mode
            if (unifiedRandom) {
                // Unified random uses pre-selected textures per part
                return null; // Will be handled by individual checks
            }
            if (linked) {
                return linkedTexture; // All parts use the same random texture
            }
            return getRandomElement(textureList); // Each part gets different random texture
        };
        
        // Process front sidedef
        if (ld.front) {
            // Upper texture
            if (upperMode === 1) { // Edit
                ld.front.upperTexture = unifiedRandom ? unifiedUpperTexture : (linked ? linkedTexture : getRandomElement(textureList));
            } else if (upperMode === 2) { // Clear
                ld.front.upperTexture = '-';
            }
            // Skip mode (0) does nothing
            
            // Middle texture
            if (middleMode === 1) { // Edit
                ld.front.middleTexture = unifiedRandom ? unifiedMiddleTexture : (linked ? linkedTexture : getRandomElement(textureList));
            } else if (middleMode === 2) { // Clear
                ld.front.middleTexture = '-';
            }
            
            // Lower texture
            if (lowerMode === 1) { // Edit
                ld.front.lowerTexture = unifiedRandom ? unifiedLowerTexture : (linked ? linkedTexture : getRandomElement(textureList));
            } else if (lowerMode === 2) { // Clear
                ld.front.lowerTexture = '-';
            }
        }
        
        // Process back sidedef if it exists
        if (ld.back) {
            // Upper texture
            if (upperMode === 1) { // Edit
                ld.back.upperTexture = unifiedRandom ? unifiedUpperTexture : (linked ? linkedTexture : getRandomElement(textureList));
            } else if (upperMode === 2) { // Clear
                ld.back.upperTexture = '-';
            }
            
            // Middle texture
            if (middleMode === 1) { // Edit
                ld.back.middleTexture = unifiedRandom ? unifiedMiddleTexture : (linked ? linkedTexture : getRandomElement(textureList));
            } else if (middleMode === 2) { // Clear
                ld.back.middleTexture = '-';
            }
            
            // Lower texture
            if (lowerMode === 1) { // Edit
                ld.back.lowerTexture = unifiedRandom ? unifiedLowerTexture : (linked ? linkedTexture : getRandomElement(textureList));
            } else if (lowerMode === 2) { // Clear
                ld.back.lowerTexture = '-';
            }
        }
        
        // Apply unpegged flags
        if (unpeggedMode > 0) {
            applyUnpeggedFlags(ld, unpeggedMode);
        }
        
        processedCount++;
    });
    
    // Build result message
    const modeNames = [
        'Mode 1: current selection',
        'Mode 2: Doom2.wad',
        'Mode 3: custom resources',
        'Mode 4: all available',
        'Mode 5: list'
    ];
    
    const unpeggedNames = [
        'no change',
        'upper unpegged',
        'lower unpegged',
        'both unpegged'
    ];
    
    let message = `Processed ${processedCount} linedef(s)`;
    
    if (textureList) {
        message += ` using ${modeNames[mode]} (${textureList.length} textures available)`;
    }
    
    const actionNames = ['skip', 'edit', 'clear'];
    message += `\nUpper: ${actionNames[upperMode]}, Middle: ${actionNames[middleMode]}, Lower: ${actionNames[lowerMode]}`;
    
    if (unpeggedMode > 0) {
        message += `\nFlags: ${unpeggedNames[unpeggedMode]}`;
    }
    
    if (unifiedRandom && textureList) {
        message += '\nUsed same random texture for all linedefs';
        const texParts = [];
        if (upperMode === 1) texParts.push(`Upper: ${unifiedUpperTexture}`);
        if (middleMode === 1) texParts.push(`Middle: ${unifiedMiddleTexture}`);
        if (lowerMode === 1) texParts.push(`Lower: ${unifiedLowerTexture}`);
        if (texParts.length > 0) {
            message += `\n${texParts.join(', ')}`;
        }
    }
    
    UDB.showMessage(message);
}

main();