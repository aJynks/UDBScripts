`#version 5`;
`#name Colormap Control Sector`;
`#description Draws 242 control sector triangles at the mouse position. Sectors are grouped by unique floor+ceiling height, then subgrouped by tag. Untagged sectors within a group are assigned a new shared tag. One control sector is created per subgroup. Control sectors are arranged in a near-square grid, spaced 16mu apart.
Requires: one or more sectors selected or highlighted in Sector mode.`;

`#scriptoptions

upper
{
    description = "Upper colormap (8 chars max, optional)";
    default = "";
    type = 2;
}

middle
{
    description = "Middle colormap (8 chars max, optional)";
    default = "";
    type = 2;
}

lower
{
    description = "Lower colormap (8 chars max, optional)";
    default = "";
    type = 2;
}

spacing
{
    description = "Grid spacing between control sectors (mu)";
    default = 64;
    type = 0;
}
`;

// ── 1. Get selected/highlighted sectors ─────────────────────────────────────
const selSectors = UDB.Map.getSelectedOrHighlightedSectors();

if (selSectors.length === 0) {
    UDB.showMessage('ERROR: No sectors selected or highlighted.\nPlease select sectors first and make sure you are in Sector mode.');
    UDB.die();
}

// ── 2. Read and validate colormap options ────────────────────────────────────
const cmUpper  = UDB.ScriptOptions.upper.trim();
const cmMiddle = UDB.ScriptOptions.middle.trim();
const cmLower  = UDB.ScriptOptions.lower.trim();

if (cmUpper === '' && cmMiddle === '' && cmLower === '') {
    UDB.showMessage('ERROR: At least one colormap field must be filled in.');
    UDB.die();
}

if (cmUpper.length > 8) {
    UDB.showMessage('ERROR: Upper colormap name "' + cmUpper + '" exceeds 8 characters.');
    UDB.die();
}

if (cmMiddle.length > 8) {
    UDB.showMessage('ERROR: Middle colormap name "' + cmMiddle + '" exceeds 8 characters.');
    UDB.die();
}

if (cmLower.length > 8) {
    UDB.showMessage('ERROR: Lower colormap name "' + cmLower + '" exceeds 8 characters.');
    UDB.die();
}

// ── 3. Build subgroups ───────────────────────────────────────────────────────
// First pass: collect all untagged sectors per floor+ceiling group and assign
// them a new shared tag. Then key every sector by floor,ceiling,tag.
//
// usedTags tracks tags allocated this run so getNewTag doesn't reuse them.

const usedTags = [];

// Find untagged sectors per floor+ceiling group and assign new tags.
// tempGroupNoTag: key = "floor,ceiling" -> new tag assigned
const tempGroupNoTag = {};

for (let i = 0; i < selSectors.length; i++) {
    const s = selSectors[i];
    if (s.tag === 0) {
        const heightKey = s.floorHeight + ',' + s.ceilingHeight;
        if (!tempGroupNoTag[heightKey]) {
            // Allocate a new tag for all untagged sectors in this height group
            const newTag = UDB.Map.getNewTag(usedTags);
            usedTags.push(newTag);
            tempGroupNoTag[heightKey] = newTag;
        }
        // Assign the tag to the sector
        s.tag = tempGroupNoTag[heightKey];
    }
}

// Second pass: build final subgroup list keyed by "floor,ceiling,tag"
// Each subgroup entry stores the heights needed for the control sector.
const subgroups = {};

for (let i = 0; i < selSectors.length; i++) {
    const s = selSectors[i];
    const key = s.floorHeight + ',' + s.ceilingHeight + ',' + s.tag;
    if (!subgroups[key]) {
        subgroups[key] = { floorHeight: s.floorHeight, ceilingHeight: s.ceilingHeight, tag: s.tag };
    }
}

const subgroupList = Object.values(subgroups);
const totalSubgroups = subgroupList.length;

// ── 4. Calculate grid layout ─────────────────────────────────────────────────
// Each cell is 32mu triangle + 16mu gap = 48mu per cell.
// Columns = ceil(sqrt(N)), rows = ceil(N / cols).

const cols = Math.ceil(Math.sqrt(totalSubgroups));

// ── 5. Snap mouse position to grid ───────────────────────────────────────────
const snapped = UDB.Map.snappedToGrid(UDB.Map.mousePosition);
const originX = snapped.x;
const originY = snapped.y;

const CELL = UDB.ScriptOptions.spacing; // grid spacing between control sectors

// ── 6. Helper: draw one control sector and configure it ──────────────────────

function drawControlSector(ox, oy, floorH, ceilH, tag) {
    // Triangle layout (right angle at bottom-left):
    //   TL = (ox,      oy + 32)  <- top-left
    //   BL = (ox,      oy)       <- bottom-left  (right angle)
    //   BR = (ox + 32, oy)       <- bottom-right
    //   Hypotenuse: TL -> BR  (gets action 242)

    const TL = [ox,      oy + 32];
    const BL = [ox,      oy     ];
    const BR = [ox + 32, oy     ];

    const drawn = UDB.Map.drawLines([ TL, BL, BR, TL ]);

    if (!drawn) {
        UDB.showMessage('ERROR: Failed to draw control sector at (' + ox + ', ' + oy + ').\nCheck for overlapping geometry at that position.');
        UDB.die();
    }

    // Find the new sector via centroid intersect
    const cx = ox + (32 / 3);
    const cy = oy + (32 / 3);

    let ctrlSector = null;
    const allSectors = UDB.Map.getSectors();
    for (let i = 0; i < allSectors.length; i++) {
        if (allSectors[i].intersect([cx, cy])) {
            ctrlSector = allSectors[i];
            break;
        }
    }

    if (ctrlSector === null) {
        UDB.showMessage('ERROR: Could not locate new control sector at (' + ox + ', ' + oy + ').');
        UDB.die();
    }

    // Apply heights
    ctrlSector.floorHeight   = floorH;
    ctrlSector.ceilingHeight = ceilH;

    // Find hypotenuse sidedef by matching vertex positions
    const sidedefs = ctrlSector.getSidedefs();
    let hypoSD = null;

    for (let i = 0; i < sidedefs.length; i++) {
        const sd = sidedefs[i];
        const ld = sd.line;
        const sv = ld.start;
        const ev = ld.end;

        const matchFwd = (Math.round(sv.position.x) === ox      && Math.round(sv.position.y) === oy + 32 &&
                          Math.round(ev.position.x) === ox + 32 && Math.round(ev.position.y) === oy);

        const matchRev = (Math.round(sv.position.x) === ox + 32 && Math.round(sv.position.y) === oy &&
                          Math.round(ev.position.x) === ox      && Math.round(ev.position.y) === oy + 32);

        if (matchFwd || matchRev) {
            hypoSD = sd;
            break;
        }
    }

    if (hypoSD === null) {
        UDB.showMessage('ERROR: Could not identify hypotenuse linedef at (' + ox + ', ' + oy + ').');
        UDB.die();
    }

    // Apply action 242 and tag to the hypotenuse linedef
    hypoSD.line.action = 242;
    hypoSD.line.tag    = tag;

    // Apply colormap textures to front sidedef
    let frontSD = hypoSD.isFront ? hypoSD : hypoSD.other;
    if (frontSD === null) frontSD = hypoSD;

    if (cmUpper  !== '') frontSD.upperTexture  = cmUpper;
    if (cmMiddle !== '') frontSD.middleTexture = cmMiddle;
    if (cmLower  !== '') frontSD.lowerTexture  = cmLower;

    return ctrlSector;
}

// ── 7. Draw all control sectors in grid order and apply tags ─────────────────

for (let i = 0; i < totalSubgroups; i++) {
    const sg = subgroupList[i];
    const col = i % cols;
    const row = Math.floor(i / cols);

    const ox = originX + (col * CELL);
    const oy = originY - (row * CELL); // grow downward = decrease Y in map space

    const ctrlSector = drawControlSector(ox, oy, sg.floorHeight, sg.ceilingHeight, sg.tag);

    // Tag the control sector to match its subgroup
    ctrlSector.tag = sg.tag;
}

// ── 8. Done ──────────────────────────────────────────────────────────────────
UDB.showMessage(
    'Done! Created ' + totalSubgroups + ' control sector(s) in a ' +
    cols + ' x ' + Math.ceil(totalSubgroups / cols) + ' grid.\n' +
    'Upper:  ' + (cmUpper  || '(not set)') + '\n' +
    'Middle: ' + (cmMiddle || '(not set)') + '\n' +
    'Lower:  ' + (cmLower  || '(not set)')
);