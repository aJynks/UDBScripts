`#version 5`;
`#name Chevron Closet - Create`;
`#description Builds a chevron monster closet. Use via a hotkey and it will draw at mouse pointer snapped to grid.`;

`#scriptoptions

monsterWidth
{
	description = "Monster Width";
	default = 62;
	type = 0;
}

monsterHeight
{
	description = "Monster Height";
	default = 56;
	type = 0;
}

monsterType
{
	description = "Thing ID";
	default = 3005;
	type = 18;
}

monsterCount
{
	description = "Thing Amount";
	default = 10;
	type = 0;
}

floorHeight
{
	description = "Floor Height";
	default = 0;
	type = 0;
}

columns
{
	description = "Columns";
	default = 1;
	type = 0;
}

topAndBottom
{
	description = "Top and Bottom";
	default = false;
	type = 3;
}

extraWide
{
	description = "Extra Wide (additional width)";
	default = 0;
	type = 0;
}
`;

// ── Options ──────────────────────────────────────────────────────────────────
const MON_W       = UDB.ScriptOptions.monsterWidth;
const MON_H       = UDB.ScriptOptions.monsterHeight;
const MON_TYPE    = UDB.ScriptOptions.monsterType;
const COUNT       = UDB.ScriptOptions.monsterCount;
const FLOOR_H     = UDB.ScriptOptions.floorHeight;
const COLS        = Math.max(1, UDB.ScriptOptions.columns);
const TOP_AND_BOT = UDB.ScriptOptions.topAndBottom;
const EXTRA_WIDE  = Math.max(0, UDB.ScriptOptions.extraWide);

// ── Derived dimensions ───────────────────────────────────────────────────────
const CELL_W   = (MON_W + 1) % 2 === 0 ? MON_W + 1 : MON_W + 2;
const rawCeil  = FLOOR_H + MON_H + 2;
const CEIL_H   = rawCeil % 2 === 0 ? rawCeil : rawCeil + 1;

const MONSTER_GAP   = 2;
const DOOR_DEPTH    = 64;
const CHEVRON_COUNT = 6;
const CHEVRON_DEPTH = 32;
const ARROW_DEPTH   = CHEVRON_DEPTH;
const BRIGHTNESS    = 192;
const DOOR_TEX      = 'FIREBLU2';
const TEX_ODD       = 'FLOOR1_6';
const TEX_EVEN      = 'CEIL4_1';

const ROWS      = Math.ceil(COUNT / COLS);
const ROOM_W    = (CELL_W * COLS) + ((COLS - 1) * MONSTER_GAP) + 32 + EXTRA_WIDE;
const ROOM_HALF = Math.floor(ROOM_W / 2);
const BOX_LEN   = (ROWS * CELL_W) + ((ROWS - 1) * MONSTER_GAP) + (MONSTER_GAP * 2);

// ── Get tags ─────────────────────────────────────────────────────────────────
const newTags  = UDB.Map.getMultipleNewTags(TOP_AND_BOT ? 4 : 2);
const doorTag  = newTags[0];
const boxTag   = newTags[1];
const doorTagT = TOP_AND_BOT ? newTags[2] : 0;

// ── Cursor ──────────────────────────────────────────────────────────────────
const cur = UDB.Map.snappedToGrid(UDB.Map.mousePosition);

if (isNaN(cur.x) || isNaN(cur.y)) {
    UDB.die('Could not get cursor position. Run via a hotkey with the cursor over the map.');
}

// ── Bottom zone key Y coordinates ────────────────────────────────────────────
const yBoxTop    = cur.y;
const yBoxBot    = cur.y - BOX_LEN;
const yDoorBot   = yBoxBot - DOOR_DEPTH;
const yShoulders = yDoorBot - (CHEVRON_COUNT * CHEVRON_DEPTH);
const yTip       = yShoulders - ARROW_DEPTH;

// ── Top zone key Y coordinates ────────────────────────────────────────────────
const yDoorTopT   = yBoxTop + DOOR_DEPTH;
const yShouldersT = yDoorTopT + (CHEVRON_COUNT * CHEVRON_DEPTH);
const yTipT       = yShouldersT + ARROW_DEPTH;

const xLeft  = cur.x;
const xRight = cur.x + ROOM_W;
const cx     = cur.x + ROOM_HALF;

// ── Helper ───────────────────────────────────────────────────────────────────
function applyMarkedSectors() {
    UDB.Map.getMarkedSectors(true).forEach(function(s) {
        s.floorHeight   = FLOOR_H;
        s.ceilingHeight = CEIL_H;
        s.brightness    = BRIGHTNESS;
    });
}

// ── Draw main outer shape ────────────────────────────────────────────────────
UDB.Map.clearAllMarks(false);
if (TOP_AND_BOT) {
    UDB.Map.drawLines([
        [xLeft,  yBoxTop],
        [xLeft,  yShouldersT],
        [cx,     yTipT],
        [xRight, yShouldersT],
        [xRight, yShoulders],
        [cx,     yTip],
        [xLeft,  yShoulders],
        [xLeft,  yBoxTop]
    ]);
} else {
    UDB.Map.drawLines([
        [xLeft,  yBoxTop],
        [xRight, yBoxTop],
        [xRight, yShoulders],
        [cx,     yTip],
        [xLeft,  yShoulders],
        [xLeft,  yBoxTop]
    ]);
}
applyMarkedSectors();

// ── Bottom: door and chevron dividers ─────────────────────────────────────────
UDB.Map.drawLines([[xLeft, yBoxBot],  [xRight, yBoxBot]]);
UDB.Map.drawLines([[xLeft, yDoorBot], [xRight, yDoorBot]]);

for (let i = 0; i < CHEVRON_COUNT; i++) {
    const chevTop    = yDoorBot - (i * CHEVRON_DEPTH);
    const chevBottom = chevTop - CHEVRON_DEPTH;
    UDB.Map.drawLines([[cx, chevBottom], [xLeft,  chevTop]]);
    UDB.Map.drawLines([[cx, chevBottom], [xRight, chevTop]]);
}

// ── Top: door and chevron dividers ────────────────────────────────────────────
if (TOP_AND_BOT) {
    // Door sector: between yBoxTop and yDoorTopT
    UDB.Map.drawLines([[xLeft, yBoxTop],   [xRight, yBoxTop]]);   // bottom of top door (shared with box top)
    UDB.Map.drawLines([[xLeft, yDoorTopT], [xRight, yDoorTopT]]); // top of top door / bottom of chevron zone

    for (let i = 0; i < CHEVRON_COUNT; i++) {
        const chevBot = yDoorTopT + (i * CHEVRON_DEPTH);
        const chevTop = chevBot + CHEVRON_DEPTH;
        UDB.Map.drawLines([[cx, chevTop], [xLeft,  chevBot]]);
        UDB.Map.drawLines([[cx, chevTop], [xRight, chevBot]]);
    }
}

// ── Bottom door sector properties ─────────────────────────────────────────────
const doorTestPoint = [cx, yBoxBot - Math.floor(DOOR_DEPTH / 2)];
UDB.Map.getSectors().forEach(function(s) {
    if (s.intersect(doorTestPoint)) {
        s.floorHeight   = CEIL_H;
        s.ceilingHeight = CEIL_H;
        s.brightness    = BRIGHTNESS;
        s.tag           = doorTag;
        s.floorTexture   = 'FLOOR0_1';
        s.ceilingTexture = 'CEIL1_1';
    }
});

// ── Box sector tag and textures ───────────────────────────────────────────────
const boxTestPoint = [cx, yBoxTop - Math.floor(BOX_LEN / 2)];
UDB.Map.getSectors().forEach(function(s) {
    if (s.intersect(boxTestPoint)) {
        s.tag            = boxTag;
        s.floorTexture   = 'FLOOR0_1';
        s.ceilingTexture = 'CEIL1_1';
    }
});

// ── Top door sector properties ────────────────────────────────────────────────
if (TOP_AND_BOT) {
    const doorTestPointT = [cx, yBoxTop + Math.floor(DOOR_DEPTH / 2)];
    UDB.Map.getSectors().forEach(function(s) {
        if (s.intersect(doorTestPointT)) {
            s.floorHeight   = CEIL_H;
            s.ceilingHeight = CEIL_H;
            s.brightness    = BRIGHTNESS;
            s.tag           = doorTagT;
            s.floorTexture   = 'FLOOR0_1';
            s.ceilingTexture = 'CEIL1_1';
        }
    });
}

// ── Door textures ─────────────────────────────────────────────────────────────
UDB.Map.getLinedefs().forEach(function(ld) {
    const cp = ld.getCenterPoint();

    if (Math.abs(cp.y - yBoxBot) < 1 && Math.abs(cp.x - cx) < ROOM_HALF) {
        if (ld.back !== null) ld.back.lowerTexture = DOOR_TEX;
    }
    if (Math.abs(cp.y - yDoorBot) < 1 && Math.abs(cp.x - cx) < ROOM_HALF) {
        if (ld.front !== null) ld.front.lowerTexture = DOOR_TEX;
    }
    if (TOP_AND_BOT) {
        if (Math.abs(cp.y - yBoxTop) < 1 && Math.abs(cp.x - cx) < ROOM_HALF) {
            if (ld.front !== null) ld.front.lowerTexture = DOOR_TEX;
        }
        if (Math.abs(cp.y - yDoorTopT) < 1 && Math.abs(cp.x - cx) < ROOM_HALF) {
            if (ld.back !== null) ld.back.lowerTexture = DOOR_TEX;
        }
    }
});

// ── Linedef special 253 ───────────────────────────────────────────────────────
UDB.Map.getLinedefs().forEach(function(ld) {
    const cp = ld.getCenterPoint();

    if (Math.abs(cp.x - xRight) < 1 && cp.y < yBoxBot && cp.y > yDoorBot) {
        ld.action = 253; ld.tag = doorTag;
    }
    if (Math.abs(cp.x - xRight) < 1 && cp.y < yBoxTop && cp.y > yBoxBot) {
        ld.action = 253; ld.tag = boxTag;
    }
    if (TOP_AND_BOT && Math.abs(cp.x - xRight) < 1 && cp.y > yBoxTop && cp.y < yDoorTopT) {
        ld.action = 253; ld.tag = doorTagT;
    }
});

// ── Linedef special 126 ───────────────────────────────────────────────────────
UDB.Map.getLinedefs().forEach(function(ld) {
    if (ld.back === null) return;

    const sx = ld.start.position.x;
    const sy = ld.start.position.y;
    const ex = ld.end.position.x;
    const ey = ld.end.position.y;

    const startAtCenter = Math.abs(sx - cx) < 1;
    const endAtCenter   = Math.abs(ex - cx) < 1;
    const startAtEdge   = Math.abs(sx - xLeft) < 1 || Math.abs(sx - xRight) < 1;
    const endAtEdge     = Math.abs(ex - xLeft) < 1 || Math.abs(ex - xRight) < 1;
    const isChevronLine = (startAtCenter && endAtEdge) || (endAtCenter && startAtEdge);

    if (isChevronLine) {
        const midY = (sy + ey) / 2;
        if (midY > yTip && midY < yDoorBot) ld.action = 126;
        if (TOP_AND_BOT && midY < yTipT && midY > yDoorTopT) ld.action = 126;
    }

    // Bottom tip outer lines
    const startIsTip      = Math.abs(sx - cx) < 1 && Math.abs(sy - yTip) < 1;
    const endIsTip        = Math.abs(ex - cx) < 1 && Math.abs(ey - yTip) < 1;
    const startIsShoulder = (Math.abs(sx - xLeft) < 1 || Math.abs(sx - xRight) < 1) && Math.abs(sy - yShoulders) < 1;
    const endIsShoulder   = (Math.abs(ex - xLeft) < 1 || Math.abs(ex - xRight) < 1) && Math.abs(ey - yShoulders) < 1;
    if ((startIsTip && endIsShoulder) || (endIsTip && startIsShoulder)) ld.action = 126;

    if (TOP_AND_BOT) {
        const startIsTipT      = Math.abs(sx - cx) < 1 && Math.abs(sy - yTipT) < 1;
        const endIsTipT        = Math.abs(ex - cx) < 1 && Math.abs(ey - yTipT) < 1;
        const startIsShoulderT = (Math.abs(sx - xLeft) < 1 || Math.abs(sx - xRight) < 1) && Math.abs(sy - yShouldersT) < 1;
        const endIsShoulderT   = (Math.abs(ex - xLeft) < 1 || Math.abs(ex - xRight) < 1) && Math.abs(ey - yShouldersT) < 1;
        if ((startIsTipT && endIsShoulderT) || (endIsTipT && startIsShoulderT)) ld.action = 126;
    }
});

// ── Chevron sector textures (bottom) ──────────────────────────────────────────
UDB.Map.getSectors().forEach(function(s) {
    const testY = yTip + Math.floor(ARROW_DEPTH / 2);
    if (testY > yTip && testY < yDoorBot && s.intersect([cx, testY])) {
        s.floorTexture = TEX_ODD; s.ceilingTexture = TEX_ODD;
    }
});
for (let i = 0; i < CHEVRON_COUNT; i++) {
    const bandTop     = yDoorBot - (i * CHEVRON_DEPTH);
    const bandBot     = bandTop - CHEVRON_DEPTH;
    const bandCenterY = bandBot + Math.floor(CHEVRON_DEPTH / 2);
    const tex = ((CHEVRON_COUNT - i + 1) % 2 === 1) ? TEX_ODD : TEX_EVEN;
    if (bandCenterY > yTip && bandCenterY < yDoorBot) {
        UDB.Map.getSectors().forEach(function(s) {
            if (s.intersect([cx - 1, bandCenterY])) {
                s.floorTexture = tex; s.ceilingTexture = tex;
            }
        });
    }
}

// ── Chevron sector textures (top) ─────────────────────────────────────────────
if (TOP_AND_BOT) {
    UDB.Map.getSectors().forEach(function(s) {
        const testY = yTipT - Math.floor(ARROW_DEPTH / 2);
        if (testY < yTipT && testY > yDoorTopT && s.intersect([cx, testY])) {
            s.floorTexture = TEX_ODD; s.ceilingTexture = TEX_ODD;
        }
    });
    for (let i = 0; i < CHEVRON_COUNT; i++) {
        const bandBot     = yDoorTopT + (i * CHEVRON_DEPTH);
        const bandCenterY = bandBot + Math.floor(CHEVRON_DEPTH / 2);
        const tex = ((CHEVRON_COUNT - i + 1) % 2 === 1) ? TEX_ODD : TEX_EVEN;
        if (bandCenterY > yDoorTopT && bandCenterY < yTipT) {
            UDB.Map.getSectors().forEach(function(s) {
                if (s.intersect([cx - 1, bandCenterY])) {
                    s.floorTexture = tex; s.ceilingTexture = tex;
                }
            });
        }
    }
}

// ── Place monsters ────────────────────────────────────────────────────────────
const totalGridW = (CELL_W * COLS) + ((COLS - 1) * MONSTER_GAP);
const gridLeft   = cx - Math.floor(totalGridW / 2);

let placed = 0;
for (let col = 0; col < COLS && placed < COUNT; col++) {
    const monX = gridLeft + (col * (CELL_W + MONSTER_GAP)) + Math.floor(CELL_W / 2);
    for (let row = 0; row < ROWS && placed < COUNT; row++) {
        const monY = yBoxTop - MONSTER_GAP - (CELL_W / 2) - row * (CELL_W + MONSTER_GAP);
        const t = UDB.Map.createThing([monX, monY], MON_TYPE);
        t.angle = 270;
        placed++;
    }
}

// ── Join top and bottom door sectors if TOP_AND_BOT ──────────────────────────
if (TOP_AND_BOT) {
    const bottomDoorTest = [cx, yBoxBot - Math.floor(DOOR_DEPTH / 2)];
    const topDoorTest    = [cx, yBoxTop + Math.floor(DOOR_DEPTH / 2)];

    let bottomDoor = null;
    let topDoor    = null;

    UDB.Map.getSectors().forEach(function(s) {
        if (s.intersect(bottomDoorTest)) bottomDoor = s;
        if (s.intersect(topDoorTest))    topDoor    = s;
    });

    if (bottomDoor !== null && topDoor !== null) {
        const lowestTag  = Math.min(doorTag, doorTagT);
        const removedTag = Math.max(doorTag, doorTagT);

        UDB.Map.joinSectors([bottomDoor, topDoor]);

        bottomDoor.tag = lowestTag;

        UDB.Map.getLinedefs().forEach(function(ld) {
            if (ld.action === 253 && ld.tag === removedTag) {
                ld.action = 0;
                ld.tag    = 0;
            }
        });
    }
}

UDB.exit('Chevron closet drawn. Door tag: ' + doorTag + ', Box tag: ' + boxTag + '. Monsters placed: ' + placed + '.');