/// <reference path="../udbscript.d.ts" />

`#version 4`;

`#name Square Spinner Helper (Cube Select)`;

`#description Selects every linedef belonging to ONE cube of a rotation-spinner structure so it can be aligned or edited manually. Select the structure's loose CENTER vertex (or hover the mouse near it) and run via hotkey. Size = the cube size (e.g. 128 for a 128x128 cube). Cube = which cube, starting at 1: Cube 1 is the first (unrotated) cube, so cube 3 of 4 is Cube 3. Total Cubes = how many cubes the structure was built with (sets the rotation step). The script reconstructs the cube's ideal edges, finds which pieces geometrically fit them, then selects every piece carrying that cube's dominant texture name - so even tiny rounding-wonky pieces near the crossings are caught. Everything else is deselected.`;

`#scriptoptions

size
{
	description = "Size";
	type = 0; // integer
	default = 64;
}

cube
{
	description = "Cube";
	type = 0; // integer
	default = 1;
}

totalCubes
{
	description = "Total Cubes";
	type = 0; // integer
	default = 4;
}
`;

var size = UDB.ScriptOptions.size;
var cube = UDB.ScriptOptions.cube;
var total = UDB.ScriptOptions.totalCubes;

if (size < 2)
	UDB.die('Size must be at least 2 (got ' + size + ').');
if (total < 1)
	UDB.die('Total Cubes must be at least 1 (got ' + total + ').');
if (cube < 1 || cube > total)
	UDB.die('Cube starts at 1: enter 1 to ' + total + ' for ' + total + ' cubes (got ' + cube + ').');

var cubeIdx = cube - 1; // internal zero-based rotation index

var half = size / 2;

// ---------------------------------------------------------------------------
// Find the center: exactly one selected vertex, or the vertex nearest the mouse.
// ---------------------------------------------------------------------------
var centerV = null;
var selV = [];
if (typeof UDB.Map.getSelectedVertices === 'function')
	selV = UDB.Map.getSelectedVertices();

if (selV.length === 1) {
	centerV = selV[0];
} else if (selV.length > 1) {
	UDB.die('Select ONLY the structure\'s center vertex (' + selV.length + ' vertices are selected).');
} else {
	var mp = UDB.Map.mousePosition;
	if (mp != null && typeof UDB.Map.nearestVertex === 'function') {
		var nv = UDB.Map.nearestVertex(mp);
		if (nv != null) {
			var ndx = nv.position.x - mp.x, ndy = nv.position.y - mp.y;
			if (ndx * ndx + ndy * ndy <= 64 * 64)
				centerV = nv;
		}
	}
}
if (centerV == null)
	UDB.die('Select the structure\'s center vertex, or hover the mouse near it, and run via hotkey.');

var cx = centerV.position.x;
var cy = centerV.position.y;

// ---------------------------------------------------------------------------
// Ideal (un-rounded) corners of every cube in the structure, same math as the
// generator: cube j is rotated j * (90 / total) degrees.
// ---------------------------------------------------------------------------
var baseCorners = [[-half, -half], [half, -half], [half, half], [-half, half]];
var cubesIdeal = [];
for (var j = 0; j < total; j++) {
	var ang = (j * (90.0 / total)) * Math.PI / 180.0;
	var ca = Math.cos(ang), sa = Math.sin(ang);
	var IC = [];
	for (var b = 0; b < 4; b++) {
		IC.push([
			cx + (baseCorners[b][0] * ca - baseCorners[b][1] * sa),
			cy + (baseCorners[b][0] * sa + baseCorners[b][1] * ca)
		]);
	}
	cubesIdeal.push(IC);
}

// |cos| between a piece direction and edge e of a corner set.
function edgeCos(IC, e, pdx, pdy, plen) {
	var EA = IC[e], EB = IC[(e + 1) % 4];
	var ex = EB[0] - EA[0], ey = EB[1] - EA[1];
	var el = Math.sqrt(ex * ex + ey * ey);
	return Math.abs((pdx * ex + pdy * ey) / (plen * el));
}

// Perpendicular distance from a point to edge e's infinite line.
function edgePerp(IC, e, px, py) {
	var EA = IC[e], EB = IC[(e + 1) % 4];
	var ex = EB[0] - EA[0], ey = EB[1] - EA[1];
	var el = Math.sqrt(ex * ex + ey * ey);
	return Math.abs((px - EA[0]) * ey - (py - EA[1]) * ex) / el;
}

// Is a point within edge e's extent (with margin)?
function edgeWithin(IC, e, px, py, margin) {
	var EA = IC[e], EB = IC[(e + 1) % 4];
	var ex = EB[0] - EA[0], ey = EB[1] - EA[1];
	var el = Math.sqrt(ex * ex + ey * ey);
	var t = ((px - EA[0]) * ex + (py - EA[1]) * ey) / el;
	return t >= -margin && t <= el + margin;
}

// Best-fitting (cube, perp-score) for a piece across ALL cubes, or null.
function bestCubeOf(p1x, p1y, p2x, p2y) {
	var pdx = p2x - p1x, pdy = p2y - p1y;
	var plen = Math.sqrt(pdx * pdx + pdy * pdy);
	if (plen === 0) return null;
	var mpx = (p1x + p2x) / 2, mpy = (p1y + p2y) / 2;
	var bestJ = -1, bestP = 1e9;
	for (var j = 0; j < cubesIdeal.length; j++) {
		var IC = cubesIdeal[j];
		var eA = (edgeCos(IC, 0, pdx, pdy, plen) >= edgeCos(IC, 1, pdx, pdy, plen)) ? 0 : 1;
		var eB = eA + 2;
		var e = (edgePerp(IC, eA, mpx, mpy) <= edgePerp(IC, eB, mpx, mpy)) ? eA : eB;
		if (!edgeWithin(IC, e, mpx, mpy, 3)) continue;
		var perp = edgePerp(IC, e, mpx, mpy);
		// penalise direction mismatch so a crossing piece prefers its true cube
		var score = perp + (1 - edgeCos(IC, e, pdx, pdy, plen)) * 20;
		if (score < bestP) { bestP = score; bestJ = j; }
	}
	if (bestJ < 0 || bestP > 4) return null;
	return { j: bestJ };
}

// ---------------------------------------------------------------------------
// Gather structure pieces near the center, geometrically assign each to a
// cube, and tally texture names on the pieces of the TARGET cube.
// ---------------------------------------------------------------------------
var R = half * 1.4142136 + 6;
var R2 = R * R;
var cands = [];
var allLds = UDB.Map.getLinedefs();
for (var i = 0; i < allLds.length; i++) {
	var Ld = allLds[i];
	var cp = Ld.getCenterPoint();
	var dx = cp.x - cx, dy = cp.y - cy;
	if (dx * dx + dy * dy > R2) continue;
	cands.push(Ld);
}
if (cands.length === 0)
	UDB.die('No linedefs found within ' + Math.round(R) + ' units of the vertex. Wrong Size, or wrong vertex?');

var nameVotes = {};
var geomPicks = [];
for (var c = 0; c < cands.length; c++) {
	var L = cands[c];
	var fit = bestCubeOf(L.start.position.x, L.start.position.y, L.end.position.x, L.end.position.y);
	if (fit == null || fit.j !== cubeIdx) continue;
	geomPicks.push(L);
	// vote with the OUTWARD side's midtexture (image side)
	var onF = L.sideOfLine(new UDB.Vector2D(cx, cy)) < 0;
	var out = onF ? L.back : L.front;
	var nm = (out != null) ? out.middleTexture : '';
	if (nm !== '' && nm !== '-') {
		if (nameVotes[nm] == null) nameVotes[nm] = 0;
		nameVotes[nm]++;
	}
}

// dominant name
var domName = null, domCount = 0;
for (var nk in nameVotes) {
	if (nameVotes[nk] > domCount) { domCount = nameVotes[nk]; domName = nk; }
}

// ---------------------------------------------------------------------------
// Select: by dominant NAME if we have one (catches even the wonky pieces that
// geometry misjudges, since splits copy the name), else the geometric picks.
// ---------------------------------------------------------------------------
var already = UDB.Map.getSelectedLinedefs();
for (var d = 0; d < already.length; d++)
	already[d].selected = false;

var picked = 0;
if (domName != null) {
	for (var s = 0; s < cands.length; s++) {
		var CL = cands[s];
		var fm = (CL.front != null) ? CL.front.middleTexture : '';
		var bm = (CL.back != null) ? CL.back.middleTexture : '';
		if (fm === domName || bm === domName) {
			CL.selected = true;
			picked++;
		}
	}
} else {
	for (var g = 0; g < geomPicks.length; g++) {
		geomPicks[g].selected = true;
		picked++;
	}
}

if (picked === 0)
	UDB.die('Nothing matched cube ' + cube + ' of ' + total + ' at size ' + size + '. Check the options against how the structure was built.');

UDB.exit(picked + ' lines selected for cube ' + cube + ' of ' + total
	+ (domName != null ? ' (texture ' + domName + ')' : ' (by geometry - no texture name found)')
	+ '.');