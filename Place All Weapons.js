`#version 5`;

`#name Place All Weapons`;

`#description Places a predefined set of ammo and weapons at sector center or cursor position. Option to spread items in a square grid pattern.`;

`#scriptoptions

place_mode
{
    description = "Place at";
    type = 11;
    default = 0;
    enumvalues
    {
        0 = "Sector";
        1 = "Cursor";
    }
}

spread_items
{
    description = "Spread";
    type = 11;
    default = 0;
    enumvalues
    {
        0 = "False";
        1 = "True";
    }
}

`;

// Item groups - items in same group stack at same position
const itemGroups = [
    [ // Bullets group
        { type: 2007, name: 'Clip', count: 2 },
        { type: 2048, name: 'Box of Bullets', count: 6 }
    ],
    [ // Shells group
        { type: 2049, name: 'Box of Shells', count: 4 }
    ],
    [ // Rockets group
        { type: 2010, name: 'Rocket', count: 2 },
        { type: 2046, name: 'Box of Rockets', count: 19 }
    ],
    [ // Cells group
        { type: 17, name: 'Cell Pack', count: 5 }
    ],
    [ // Backpack
        { type: 8, name: 'Backpack', count: 1 }
    ],
    [ // Shotgun
        { type: 2001, name: 'Shotgun', count: 1 }
    ],
    [ // Super Shotgun
        { type: 82, name: 'Super Shotgun', count: 1 }
    ],
    [ // Chaingun
        { type: 2002, name: 'Chaingun', count: 1 }
    ],
    [ // Plasma Gun
        { type: 2004, name: 'Plasma Gun', count: 1 }
    ],
    [ // Rocket Launcher
        { type: 2003, name: 'Rocket Launcher', count: 1 }
    ],
    [ // BFG9000
        { type: 2006, name: 'BFG9000', count: 1 }
    ]
];

// Calculate total item count
let totalItems = 0;
for (const group of itemGroups) {
    for (const item of group) {
        totalItems += item.count;
    }
}

// Get placement position based on mode
let placementPos;

if (UDB.ScriptOptions.place_mode === 0) {
    // Selected Sector Center mode
    const selectedSectors = UDB.Map.getSelectedSectors();
    
    if (selectedSectors.length === 0) {
        UDB.showMessage('Error: No sector selected. Please select exactly one sector.');
        UDB.die();
    }
    
    if (selectedSectors.length > 1) {
        UDB.showMessage('Error: Multiple sectors selected. Please select exactly one sector.');
        UDB.die();
    }
    
    // Get label positions for the sector (these are the sector centers)
    const labelPositions = selectedSectors[0].getLabelPositions();
    
    if (labelPositions.length === 0) {
        UDB.showMessage('Error: Could not determine sector center position.');
        UDB.die();
    }
    
    placementPos = labelPositions[0];
} else {
    // Cursor Position mode
    placementPos = UDB.Map.mousePosition;
}

// Snap position to grid
placementPos = UDB.Map.snappedToGrid(placementPos);

// Place items
if (UDB.ScriptOptions.spread_items === 1) {
    // Items are 40 units wide, so spacing is 40/2 + 16 + 8 = 44 units
    const spacing = 44;
    
    // Define the layout as specific rows
    const layout = [
        // Row 0: Ammo types (4 groups)
        [0, 1, 2, 3],  // bullets, shells, rockets, cells
        // Row 1: Weapons (5 groups)
        [5, 6, 7, 8, 9, 10],  // shotgun, ssg, chaingun, plasma, rocket launcher, bfg
        // Row 2: Backpack (1 group, centered)
        [4]  // backpack
    ];
    
    let groupsPlaced = 0;
    
    // Place each row
    for (let rowIdx = 0; rowIdx < layout.length; rowIdx++) {
        const row = layout[rowIdx];
        const rowWidth = row.length;
        
        // Center this row
        const rowOffsetX = -(rowWidth - 1) * spacing / 2;
        
        for (let colIdx = 0; colIdx < row.length; colIdx++) {
            const groupIdx = row[colIdx];
            const group = itemGroups[groupIdx];
            
            const x = placementPos.x + rowOffsetX + (colIdx * spacing);
            const y = placementPos.y - (rowIdx * spacing);
            
            const pos = UDB.Map.snappedToGrid(new UDB.Vector2D(x, y));
            
            // Place all items in this group at the same position (stacked)
            for (const item of group) {
                for (let i = 0; i < item.count; i++) {
                    UDB.Map.createThing(pos, item.type);
                }
            }
            
            groupsPlaced++;
        }
    }
    
    UDB.showMessage(`Placed ${itemGroups.length} item groups (${totalItems} total items) in 3 rows at (${Math.round(placementPos.x)}, ${Math.round(placementPos.y)})`);
} else {
    // Stack all items at the same position
    // Place everything except super shotgun first
    for (const group of itemGroups) {
        for (const item of group) {
            // Skip super shotgun (type 82) for now
            if (item.type === 82) continue;
            
            for (let i = 0; i < item.count; i++) {
                UDB.Map.createThing(placementPos, item.type);
            }
        }
    }
    
    // Place super shotgun last, 1 unit higher
    const superShotgunPos = new UDB.Vector2D(placementPos.x, placementPos.y + 1);
    UDB.Map.createThing(superShotgunPos, 82);
    
    UDB.showMessage(`Placed ${totalItems} items (stacked) at (${Math.round(placementPos.x)}, ${Math.round(placementPos.y)})`);
}