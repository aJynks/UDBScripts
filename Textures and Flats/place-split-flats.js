/// <reference path="../udbscript.d.ts" />

`#version 4`;

`#name Place Split Flats`;

`#description Draws a grid of 64x64 sectors at the mouse cursor (snapped to the 64 grid, top-left corner at the cursor) and applies a numbered flat sequence (flatName + 001, 002, ...) in reading order to the floor, ceiling, or both. All sectors share the given floor/ceiling heights so the grid reads as one room. Run with the mouse over the map.`;

`#scriptoptions

floor
{
	description = "Floor height";
	default = 0;
	type = 0;
}

ceiling
{
	description = "Ceiling height";
	default = 128;
	type = 0;
}

flatName
{
	description = "Flat name prefix, no number (e.g. flor_ or floor)";
	default = "flat_";
	type = 2;
}

flats
{
	description = "Number of flats; leading zeros set padding (006 -> 001.., 6 -> 1..)";
	default = "001";
	type = 2;
}

size
{
	description = "64x64 blocks per row (0 = single row)";
	default = 0;
	type = 0;
}

place
{
	description = "Apply flats to";
	default = 0;
	type = 11;
	enumvalues {
		0 = "Floor";
		1 = "Ceiling";
		2 = "Both";
	}
}
`;

// ---------------------------------------------------------------------------
// Read options
// ---------------------------------------------------------------------------
var floorH = Math.round(UDB.ScriptOptions.floor);
var ceilH  = Math.round(UDB.ScriptOptions.ceiling);
var prefix = '' + UDB.ScriptOptions.flatName;
var flatsRaw = ('' + UDB.ScriptOptions.flats).trim();
var perRow = Math.round(UDB.ScriptOptions.size);
var place  = Math.round(UDB.ScriptOptions.place); // 0 floor, 1 ceiling, 2 both

// ---------------------------------------------------------------------------
// Validate
// ---------------------------------------------------------------------------
if (!/^\d+$/.test(flatsRaw))
	UDB.die('Number of flats must be digits only (e.g. 6, 06, or 006).');

// The typed string sets both the count and the zero-padding width:
// "006" -> 6 flats padded to 3 digits, "6" -> 6 flats, no padding.
var count = parseInt(flatsRaw, 10);
var padWidth = flatsRaw.length;

if (count < 1)
	UDB.die('Number of flats must be at least 1.');

if (prefix.length === 0)
	UDB.die('flatName cannot be empty.');

if (prefix.length + padWidth > 8)
	UDB.die('flatName "' + prefix + '" is too long: prefix (' + prefix.length +
		' chars) + ' + padWidth + '-digit number exceeds the 8-character flat limit.');

var columns = perRow > 0 ? perRow : count;

// ---------------------------------------------------------------------------
// Origin: mouse snapped down to the 64 grid, used as the top-left corner.
// Map Y increases upward, so rows advance downward (-Y).
// ---------------------------------------------------------------------------
var GRID = 64;
var mp = UDB.Map.mousePosition;
var ox = Math.floor(mp.x / GRID) * GRID;
var oy = Math.floor(mp.y / GRID) * GRID;

function pad(n, width) {
	var s = '' + n;
	while (s.length < width) s = '0' + s;
	return s;
}

// ---------------------------------------------------------------------------
// Draw the grid one 64x64 box at a time, in reading order.
// UDB stitches shared edges into two-sided lines automatically.
// ---------------------------------------------------------------------------
var centers = [];

for (var i = 0; i < count; i++) {
	var col = i % columns;
	var row = Math.floor(i / columns);

	var left   = ox + col * GRID;
	var right  = left + GRID;
	var top    = oy - row * GRID;
	var bottom = top - GRID;

	var ok = UDB.Map.drawLines([
		[left,  top],
		[right, top],
		[right, bottom],
		[left,  bottom],
		[left,  top]
	]);

	if (!ok)
		UDB.die('Failed to draw box ' + (i + 1) + ' of ' + count + '.');

	centers.push([left + GRID / 2, top - GRID / 2]);
}

// ---------------------------------------------------------------------------
// Assign heights and the numbered flat to each cell.
// Untargeted surface keeps whatever default flat UDB gave the new sector.
// ---------------------------------------------------------------------------
var sectors = UDB.Map.getSectors();
var assigned = 0;

for (var j = 0; j < count; j++) {
	var c = centers[j];
	var sec = null;

	for (var k = 0; k < sectors.length; k++) {
		if (sectors[k].intersect(c)) {
			sec = sectors[k];
			break;
		}
	}

	if (sec === null)
		continue;

	sec.floorHeight = floorH;
	sec.ceilingHeight = ceilH;

	var flat = prefix + pad(j + 1, padWidth);
	if (place === 0 || place === 2) sec.floorTexture = flat;
	if (place === 1 || place === 2) sec.ceilingTexture = flat;

	assigned++;
}

UDB.exit('Flat Test Grid: ' + assigned + ' sector(s), ' + columns + ' per row.');