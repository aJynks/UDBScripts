/// <reference path="../udbscript.d.ts" />

`#version 4`;

`#name Place a Planer Spinner`;

`#description Builds a "plane" spinner: single lines (not cubes) rotated in even steps across 180 degrees, all crossing at one center vertex - e.g. Number 2 makes a cross. Length is the TOTAL line length (half each side of the center). Front Texture / Back Texture are first-frame names (e.g. front01, back01 - the trailing number sets the start and zero-padding; leave Back blank to mirror the front); each face's X offsets are aligned automatically so the image flows continuously across the center split, immune to linedef direction flips. Optional Elf Lines marks the lines with ELFBSP special 1087. A center vertex is guaranteed for snapping. Hover the mouse where you want the center, then run via a hotkey.`;

`#scriptoptions

number
{
	description = "Number";
	type = 0; // integer
	default = 4;
}

length
{
	description = "Length";
	type = 0; // integer
	default = 128;
}

frontTexture
{
	description = "Front Texture";
	type = 2; // string
	default = "front01";
}

frontOffset
{
	description = "Front Offset";
	type = 2; // string
	default = "0,-128";
}

backTexture
{
	description = "Back Texture";
	type = 2; // string
	default = "";
}

backOffset
{
	description = "Back Offset";
	type = 2; // string
	default = "0,-128";
}

elfLines
{
	description = "Elf Lines";
	type = 3; // bool
	default = false;
}
`;

// ---------------------------------------------------------------------------
// Options + validation
// ---------------------------------------------------------------------------
var planes = UDB.ScriptOptions.number;
var length = UDB.ScriptOptions.length;
var elfLines = UDB.ScriptOptions.elfLines;

function parseOffset(label, str) {
	var parts = ('' + str).split(',');
	if (parts.length !== 2)
		UDB.die(label + ' must be two numbers as "x,y" (got "' + str + '").');
	var x = parseInt(parts[0].trim(), 10);
	var y = parseInt(parts[1].trim(), 10);
	if (isNaN(x) || isNaN(y))
		UDB.die(label + ' must be two numbers as "x,y" (got "' + str + '").');
	return [x, y];
}

var frontOffset = parseOffset('Front Offset', UDB.ScriptOptions.frontOffset);
var backOffset = parseOffset('Back Offset', UDB.ScriptOptions.backOffset);

if (planes < 1)
	UDB.die('Number must be at least 1.');
if (planes > 1000)
	UDB.die('Number capped at 1000 (you asked for ' + planes + ').');
if (length < 8)
	UDB.die('Length must be at least 8 (got ' + length + ').');
if (length > 32768)
	UDB.die('Length capped at 32768 (got ' + length + ').');

// Split a "first frame" texture name into prefix + trailing number (trailing
// digits = start value; their count = zero padding). Blank allowed when not
// required (back mirrors front).
function parseFrameSpec(input, label, required) {
	var s = ('' + input).trim();
	if (s.length === 0) {
		if (required) UDB.die(label + ' is required.');
		return null;
	}
	var d = s.length;
	while (d > 0) {
		var c = s.charCodeAt(d - 1);
		if (c < 48 || c > 57) break; // not 0-9
		d--;
	}
	var dg = s.substring(d);
	if (dg.length === 0)
		UDB.die(label + ' must end with a frame number, e.g. front01 or BLODRIP1.');
	return { prefix: s.substring(0, d), start: parseInt(dg, 10), pad: dg.length };
}

function makeName(spec, k) {
	var n = '' + (spec.start + k);
	while (n.length < spec.pad) n = '0' + n;
	return spec.prefix + n;
}

var frontSpec = parseFrameSpec(UDB.ScriptOptions.frontTexture, 'Front Texture', true);
var backSpec = parseFrameSpec(UDB.ScriptOptions.backTexture, 'Back Texture', false); // null = mirror front

for (var nchk = 0; nchk < planes; nchk++) {
	if (makeName(frontSpec, nchk).length > 8)
		UDB.die('Front texture name "' + makeName(frontSpec, nchk) + '" exceeds the 8-character limit.');
	if (backSpec != null && makeName(backSpec, nchk).length > 8)
		UDB.die('Back texture name "' + makeName(backSpec, nchk) + '" exceeds the 8-character limit.');
}

// ---------------------------------------------------------------------------
// Center (mouse, snapped to the CURRENT grid)
// ---------------------------------------------------------------------------
var mp = UDB.Map.mousePosition;
if (mp == null)
	UDB.die('Hover the mouse over the map and run via a hotkey.');

var center = UDB.Map.snappedToGrid(mp);
var half = length / 2;

// All frame names this run applies - used to recognise already-textured
// pieces (splits copy the name) so nothing gets re-textured by a later draw.
var allFrameNames = {};
var nameToK = {};
for (var fn = 0; fn < planes; fn++) {
	var fnm = makeName(frontSpec, fn);
	allFrameNames[fnm] = true;
	nameToK[fnm] = fn;
	if (backSpec != null) {
		var bnm = makeName(backSpec, fn);
		allFrameNames[bnm] = true;
		if (nameToK[bnm] === undefined) nameToK[bnm] = fn;
	}
}

// Perp distance from a point to the infinite line through (ax,ay) along (ux,uy).
function perpDist(px, py, ax, ay, ux, uy) {
	return Math.abs((px - ax) * uy - (py - ay) * ux);
}

// ---------------------------------------------------------------------------
// 1) Draw each plane in place: a single line through the center, rotated in
//    even steps across 180 degrees. All crossings happen at the one center
//    point, so pieces just split there - no crowded-intersection ambiguity.
//    Texture NAMES are assigned per plane right after its draw (pieces already
//    carrying one of our names are earlier planes' splits and are skipped);
//    offsets are aligned in a final pass after all splits exist.
// ---------------------------------------------------------------------------
var lineData = []; // per plane: { ax, ay, ux, uy, L }

for (var k = 0; k < planes; k++) {
	var ang = (k * (180.0 / planes)) * Math.PI / 180.0;
	var ux = Math.cos(ang), uy = Math.sin(ang);

	// Round the half-vector ONCE and mirror it, so both endpoints are exact
	// mirrors and every plane passes EXACTLY through the integer center -
	// all crossings then share the single center vertex.
	var hx = Math.round(half * ux);
	var hy = Math.round(half * uy);
	var ax = center.x - hx;
	var ay = center.y - hy;
	var bx = center.x + hx;
	var by = center.y + hy;
	var L = (bx - ax) * ux + (by - ay) * uy; // full drawn length along u

	lineData.push({ ax: ax, ay: ay, ux: ux, uy: uy, L: L });

	UDB.Map.clearAllMarks();
	if (!UDB.Map.drawLines([[ax, ay], [bx, by]]))
		UDB.die('drawLines failed on plane ' + (k + 1) + '.');

	var frontName = makeName(frontSpec, k);
	var backName = (backSpec != null) ? makeName(backSpec, k) : frontName;

	var marked = UDB.Map.getMarkedLinedefs(true);
	for (var m = 0; m < marked.length; m++) {
		var ld = marked[m];
		var fmid = (ld.front != null) ? ld.front.middleTexture : '';
		var bmid = (ld.back != null) ? ld.back.middleTexture : '';
		if (allFrameNames[fmid] === true || allFrameNames[bmid] === true) continue; // earlier plane's split piece

		// must actually lie along this plane's line (skip stray split room lines)
		var cp = ld.getCenterPoint();
		if (perpDist(cp.x, cp.y, ax, ay, ux, uy) > 1.5) continue;

		ld.applySidedFlags();
		if (elfLines)
			ld.action = 1087; // ELFBSP "do not split segment" - inert in-game

		// The geometric FRONT face of the plane is the right-hand side of the
		// A->B direction u. If UDB flipped this piece, its front sidedef faces
		// the other way, so the names swap sides with it.
		var d = (ld.end.position.x - ld.start.position.x) * ux
		      + (ld.end.position.y - ld.start.position.y) * uy;
		var Sf = (d >= 0) ? ld.front : ld.back; // faces the plane's front
		var Sb = (d >= 0) ? ld.back : ld.front; // faces the plane's back

		if (Sf != null) { Sf.middleTexture = frontName; Sf.offsetX = frontOffset[0]; Sf.offsetY = frontOffset[1]; }
		if (Sb != null) { Sb.middleTexture = backName; Sb.offsetX = backOffset[0]; Sb.offsetY = backOffset[1]; }
	}
}

// ---------------------------------------------------------------------------
// 2) ALIGN pass. Splits copied one X offset onto every piece, so set each
//    piece's offsets directly by projection along its plane's ideal line -
//    immune to linedef direction flips:
//      - front face reads left-to-right from the A end:  off = base + t(min)
//      - back face reads left-to-right from the B end:   off = base + (L - t(max))
//    where t = projection of the piece's endpoints from A along u. Adjacent
//    pieces share endpoints, so the image flows continuously across the center.
// ---------------------------------------------------------------------------
var alnR = half + 6;
var alnR2 = alnR * alnR;
var alnLds = UDB.Map.getLinedefs();
for (var ai = 0; ai < alnLds.length; ai++) {
	var Ld = alnLds[ai];
	var acp = Ld.getCenterPoint();
	var adx = acp.x - center.x, ady = acp.y - center.y;
	if (adx * adx + ady * ady > alnR2) continue;

	var afm = (Ld.front != null) ? Ld.front.middleTexture : '';
	var abm = (Ld.back != null) ? Ld.back.middleTexture : '';
	var ak = nameToK[afm];
	if (ak === undefined) ak = nameToK[abm];
	if (ak === undefined) continue;

	var D = lineData[ak];
	if (perpDist(acp.x, acp.y, D.ax, D.ay, D.ux, D.uy) > 2) continue; // same-named but not on this plane

	var p1 = Ld.start.position, p2 = Ld.end.position;
	var t1 = (p1.x - D.ax) * D.ux + (p1.y - D.ay) * D.uy;
	var t2 = (p2.x - D.ax) * D.ux + (p2.y - D.ay) * D.uy;
	var tmin = Math.min(t1, t2), tmax = Math.max(t1, t2);

	var dd = (p2.x - p1.x) * D.ux + (p2.y - p1.y) * D.uy;
	var Sf2 = (dd >= 0) ? Ld.front : Ld.back;
	var Sb2 = (dd >= 0) ? Ld.back : Ld.front;

	if (Sf2 != null) {
		Sf2.offsetX = frontOffset[0] + Math.round(tmin);
		Sf2.offsetY = frontOffset[1];
	}
	if (Sb2 != null) {
		Sb2.offsetX = backOffset[0] + Math.round(D.L - tmax);
		Sb2.offsetY = backOffset[1];
	}
}

// ---------------------------------------------------------------------------
// 3) Guarantee a center vertex for snapping. With 2+ planes the crossing
//    already created one; with 1 plane (or if stitching missed), create it.
// ---------------------------------------------------------------------------
var haveCenterV = false;
if (typeof UDB.Map.nearestVertex === 'function') {
	var nv = UDB.Map.nearestVertex(center);
	if (nv != null) {
		var vdx = nv.position.x - center.x, vdy = nv.position.y - center.y;
		if (vdx * vdx + vdy * vdy <= 0.25) haveCenterV = true;
	}
}
if (!haveCenterV)
	UDB.Map.createVertex([center.x, center.y]);

UDB.Map.snapAllToAccuracy(false);
UDB.exit(planes + ' plane' + (planes === 1 ? '' : 's') + ' placed at (' + center.x + ', ' + center.y + ')'
	+ (elfLines ? ' [1087]' : '')
	+ '. Offsets aligned; center vertex ' + (haveCenterV ? 'present' : 'added') + '.');