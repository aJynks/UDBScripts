/// <reference path="../udbscript.d.ts" />

`#version 4`;

`#name Place a Square Spinner`;

`#description Builds a stack of concentric, equal-size squares, each rotated a step further across 90 degrees, for the animated-midtexture "spinning" trick. Front Texture goes on the outward side of each square, Back Texture on the inward side (both are first-frame names like BLODRIP1 / back01 - the trailing number sets the start and zero-padding; leave Back Texture blank to mirror the front). The squares are built on a clear patch found automatically inside the sector under the cursor, then moved into place, so they inherit the correct room. A bounding ring encloses the structure and is left SELECTED at the end for the manual OpenGL/free-look fix (set its back sector to the room sector). Optional Elf Lines marks the structure with ELFBSP special 1087. Optional Software Fix draws a backing that conforms to the inner space. With Intersect on, the scratch/move is skipped, Elf is forced off, no bounding ring is drawn, and the squares are drawn normally in place so all their crossings create real vertices and the outer tips bond straight to the room (no manual fix). Cut pieces are identified by their frame NAME (splits copy it), and a final pass mimics UDB's auto-align X: each face's pieces are walked corner to corner and their image-side X offsets accumulate the piece lengths, so the texture flows continuously - no manual aligning needed, at any square count. Hover the mouse where you want the center, then run via a hotkey.`;

`#scriptoptions

intersect
{
	description = "Intersect";
	type = 3; // bool
	default = true;
}

number
{
	description = "Number";
	type = 0; // integer
	default = 4;
}

size
{
	description = "Size";
	type = 0; // integer
	default = 64;
}

frontTexture
{
	description = "Front Texture";
	type = 2; // string
	default = "BLODRIP1";
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
	default = "64,-128";
}

softwareFix
{
	description = "Software Fix";
	type = 3; // bool
	default = false;
}

fixTexture
{
	description = "Fix Texture";
	type = 2; // string
	default = "";
}

elfLines
{
	description = "Elf Lines";
	type = 3; // bool
	default = true;
}
`;

// ---------------------------------------------------------------------------
// Options + validation
// ---------------------------------------------------------------------------
var squares = UDB.ScriptOptions.number;
var size = UDB.ScriptOptions.size;
var softwareFix = UDB.ScriptOptions.softwareFix;
var fixTexture = ('' + UDB.ScriptOptions.fixTexture).trim();
var elfLines = UDB.ScriptOptions.elfLines;
var intersect = UDB.ScriptOptions.intersect;
if (intersect)
	elfLines = false; // Intersect mode ignores Elf Lines

// Parse an "x,y" offset string into [x, y]; stop with a clear message if invalid.
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

if (squares < 1)
	UDB.die('Number must be at least 1.');
if (squares > 1000)
	UDB.die('Number capped at 1000 (you asked for ' + squares + ').');

var allowedSizes = [16, 32, 64, 128, 256];
if (allowedSizes.indexOf(size) < 0)
	UDB.die('Size must be one of 16, 32, 64, 128, 256 (got ' + size + ').');

// Split a "first frame" texture name into prefix + trailing number. The trailing
// digits set the start value; their length sets the zero-padding. So "test01"
// -> test01,test02..  "BLODRIP1" -> BLODRIP1..  "cust001" -> cust001..
// Returns null for a blank input when required is false.
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
		UDB.die(label + ' must end with a frame number, e.g. BLODRIP1, back01, or cust001.');
	return { prefix: s.substring(0, d), start: parseInt(dg, 10), pad: dg.length };
}

function makeName(spec, k) {
	var n = '' + (spec.start + k);
	while (n.length < spec.pad) n = '0' + n;
	return spec.prefix + n;
}

// Shortest distance from point (px,py) to segment (ax,ay)-(bx,by).
function pointSegDist(px, py, ax, ay, bx, by) {
	var dx = bx - ax, dy = by - ay;
	var len2 = dx * dx + dy * dy;
	var t = (len2 === 0) ? 0 : (((px - ax) * dx + (py - ay) * dy) / len2);
	if (t < 0) t = 0; else if (t > 1) t = 1;
	var cx = ax + t * dx, cy = ay + t * dy;
	var ex = px - cx, ey = py - cy;
	return Math.sqrt(ex * ex + ey * ey);
}

// True if a point lies on one of the 4 edges of a square (corners in order).
function onSquareEdge(px, py, c) {
	for (var e = 0; e < 4; e++) {
		var a = c[e], b = c[(e + 1) % 4];
		if (pointSegDist(px, py, a[0], a[1], b[0], b[1]) < 1.5) return true;
	}
	return false;
}

var frontSpec = parseFrameSpec(UDB.ScriptOptions.frontTexture, 'Front Texture', true);
var backSpec = parseFrameSpec(UDB.ScriptOptions.backTexture, 'Back Texture', false); // null = mirror front

// Doom texture names are limited to 8 characters.
for (var i = 0; i < squares; i++) {
	if (makeName(frontSpec, i).length > 8)
		UDB.die('Front texture name "' + makeName(frontSpec, i) + '" exceeds the 8-character limit.');
	if (backSpec != null && makeName(backSpec, i).length > 8)
		UDB.die('Back texture name "' + makeName(backSpec, i) + '" exceeds the 8-character limit.');
}
if (fixTexture.length > 8)
	UDB.die('Fix Texture "' + fixTexture + '" exceeds the 8-character limit.');

// ---------------------------------------------------------------------------
// Center (mouse, snapped to the CURRENT grid)
// ---------------------------------------------------------------------------
var mp = UDB.Map.mousePosition;
if (mp == null)
	UDB.die('Hover the mouse over the map and run via a hotkey.');

var center = UDB.Map.snappedToGrid(mp); // snaps to the active grid scale, not just 1mu
var half = size / 2;

// ---------------------------------------------------------------------------
// Find the sector under the cursor, then a CLEAR build patch inside that same
// sector (so the squares inherit the right room). Skipped entirely in Intersect
// mode, which draws the squares in place. If no clear patch can be found (normal
// mode), stop with a clear message instead of mangling anything.
// ---------------------------------------------------------------------------
var scratch = null;
if (!intersect) {
	var targetSector = null;
	var allSectors = UDB.Map.getSectors();
	for (var ti = 0; ti < allSectors.length; ti++) {
		if (allSectors[ti].intersect(center)) { targetSector = allSectors[ti]; break; }
	}
	if (targetSector == null)
		UDB.die('Place the cursor inside a sector (room) and run via the hotkey.');

	// Target sector bounding box -> how far out the search can range.
	var bMinX = Infinity, bMinY = Infinity, bMaxX = -Infinity, bMaxY = -Infinity;
	var tsd = targetSector.getSidedefs();
	for (var ts = 0; ts < tsd.length; ts++) {
		var tl = tsd[ts].line;
		var tv = [tl.start.position, tl.end.position];
		for (var tp = 0; tp < 2; tp++) {
			if (tv[tp].x < bMinX) bMinX = tv[tp].x;
			if (tv[tp].x > bMaxX) bMaxX = tv[tp].x;
			if (tv[tp].y < bMinY) bMinY = tv[tp].y;
			if (tv[tp].y > bMaxY) bMaxY = tv[tp].y;
		}
	}
	var distFromCenter = function (ax, ay) { var dx = ax - center.x, dy = ay - center.y; return Math.sqrt(dx * dx + dy * dy); };
	var maxDist = Math.max(distFromCenter(bMinX, bMinY), distFromCenter(bMaxX, bMinY),
		distFromCenter(bMinX, bMaxY), distFromCenter(bMaxX, bMaxY));

	var patchR = half * 1.4142136 + 4;       // circumradius of the Size-square patch + margin
	var minDist = Math.round(size * 1.6);    // keep the patch clear of the structure footprint

	// Pre-filter linedefs to those near the search area (cheap test per candidate).
	var nearLines = [];
	var allLines = UDB.Map.getLinedefs();
	var filterR = maxDist + patchR + 8;
	for (var li = 0; li < allLines.length; li++) {
		if (allLines[li].safeDistanceTo(center, true) <= filterR)
			nearLines.push(allLines[li]);
	}

	// A patch is clear if its center is inside the target sector and no nearby line
	// comes within the patch's reach (which also guarantees it can't cross out of
	// the sector, since leaving would require crossing a line).
	var patchClear = function (spot) {
		if (!targetSector.intersect(spot)) return false;
		for (var ci = 0; ci < nearLines.length; ci++) {
			if (nearLines[ci].safeDistanceTo(spot, true) < patchR) return false;
		}
		return true;
	};

	// Probe outward in 16 directions, increasing distance; take the first clear spot.
	var dirs = 16;
	var stepDist = Math.max(16, Math.round(half));
	for (var dist = minDist; dist <= maxDist && scratch == null; dist += stepDist) {
		for (var dd = 0; dd < dirs && scratch == null; dd++) {
			var a = (dd / dirs) * 2 * Math.PI;
			var spot = new UDB.Vector2D(center.x + Math.round(dist * Math.cos(a)), center.y + Math.round(dist * Math.sin(a)));
			if (patchClear(spot)) scratch = spot;
		}
	}
	if (scratch == null)
		UDB.die('Could not find a clear ' + size + '-unit build spot inside this sector. Try a more open spot or a smaller Size.');
}

// ---------------------------------------------------------------------------
// 1) Build squares: draw on the clear patch, move into place. Collect lines + corners.
// ---------------------------------------------------------------------------
var squareLines = []; // { ld, k }
var corners = [];     // { x, y, ang }
var sqCornersByK = []; // per-square rounded corners (intersect)
var idealCornersByK = []; // per-square UN-rounded corners (intersect align pass)

// All frame names this run will apply (intersect mode). Used to recognise
// already-textured pieces of earlier squares among the marked lines - the
// texture NAME identifies the square, immune to geometry/rounding ambiguity.
var allFrameNames = {};
if (intersect) {
	for (var fn = 0; fn < squares; fn++) {
		allFrameNames[makeName(frontSpec, fn)] = true;
		if (backSpec != null) allFrameNames[makeName(backSpec, fn)] = true;
	}
}

UDB.Map.clearAllMarks();

var baseCorners = [[-half, -half], [half, -half], [half, half], [-half, half]];

for (var k = 0; k < squares; k++) {
	var angle = (k * (90.0 / squares)) * Math.PI / 180.0; // even steps across 90 deg
	var ca = Math.cos(angle);
	var sa = Math.sin(angle);

	// This square's 4 rotated corners at the center (used by both modes + the ring).
	var sqCorners = [];
	for (var bc = 0; bc < 4; bc++) {
		var rx = Math.round(center.x + (baseCorners[bc][0] * ca - baseCorners[bc][1] * sa));
		var ry = Math.round(center.y + (baseCorners[bc][0] * sa + baseCorners[bc][1] * ca));
		sqCorners.push([rx, ry]);
		corners.push({ x: rx, y: ry, ang: Math.atan2(ry - center.y, rx - center.x) });
	}

	if (!intersect) {
		// Non-merged: draw on the clear patch, then move the corners into place
		// (setting positions never stitches, so overlaps don't merge).
		UDB.Map.clearAllMarks();
		if (!UDB.Map.drawLines([
			[scratch.x - half, scratch.y - half],
			[scratch.x + half, scratch.y - half],
			[scratch.x + half, scratch.y + half],
			[scratch.x - half, scratch.y + half],
			[scratch.x - half, scratch.y - half]
		]))
			UDB.die('drawLines failed on square ' + (k + 1) + '.');

		var verts = UDB.Map.getMarkedVertices(true);
		var lines = UDB.Map.getMarkedLinedefs(true);
		for (var v = 0; v < verts.length; v++) {
			var mpx = verts[v].position.x - scratch.x;
			var mpy = verts[v].position.y - scratch.y;
			verts[v].position = [
				Math.round(center.x + (mpx * ca - mpy * sa)),
				Math.round(center.y + (mpx * sa + mpy * ca))
			];
		}
		for (var l = 0; l < lines.length; l++)
			squareLines.push({ ld: lines[l], k: k });
	} else {
		// Intersect: draw the square in place, letting it split/merge with the
		// others (all crossings become real vertices). Texture this square's own
		// new segments now; pieces of EARLIER squares that got re-marked by the
		// split are recognised by already carrying one of our frame names (their
		// offsets/names were copied onto both halves by the split) and skipped.
		sqCornersByK.push(sqCorners);
		var idealC = [];
		for (var ib = 0; ib < 4; ib++) {
			idealC.push([
				center.x + (baseCorners[ib][0] * ca - baseCorners[ib][1] * sa),
				center.y + (baseCorners[ib][0] * sa + baseCorners[ib][1] * ca)
			]);
		}
		idealCornersByK.push(idealC);
		UDB.Map.clearAllMarks();
		if (!UDB.Map.drawLines([
			[sqCorners[0][0], sqCorners[0][1]],
			[sqCorners[1][0], sqCorners[1][1]],
			[sqCorners[2][0], sqCorners[2][1]],
			[sqCorners[3][0], sqCorners[3][1]],
			[sqCorners[0][0], sqCorners[0][1]]
		]))
			UDB.die('drawLines failed on square ' + (k + 1) + '.');

		var iName = makeName(frontSpec, k);
		var iBack = (backSpec != null) ? makeName(backSpec, k) : iName;
		var iMarked = UDB.Map.getMarkedLinedefs(true);
		for (var im = 0; im < iMarked.length; im++) {
			var ild = iMarked[im];
			var fmid = (ild.front != null) ? ild.front.middleTexture : '';
			var bmid = (ild.back != null) ? ild.back.middleTexture : '';
			if (allFrameNames[fmid] === true || allFrameNames[bmid] === true) continue; // earlier square's split piece
			var icp = ild.getCenterPoint();
			if (!onSquareEdge(icp.x, icp.y, sqCorners)) continue; // stray (e.g. a split room line)
			ild.applySidedFlags();
			var iOnFront = ild.sideOfLine(center) < 0;
			var iOut = iOnFront ? ild.back : ild.front;
			var iIn = iOnFront ? ild.front : ild.back;
			if (iOut != null) { iOut.middleTexture = iName; iOut.offsetX = frontOffset[0]; iOut.offsetY = frontOffset[1]; }
			if (iIn != null) { iIn.middleTexture = iBack; iIn.offsetX = backOffset[0]; iIn.offsetY = backOffset[1]; }
		}
	}
}

// ---------------------------------------------------------------------------
// 1b) AUTO-ALIGN pass (intersect mode). Every cut piece carries its square's
//     frame NAME (set directly or inherited when a later square split it), so
//     the name pins the piece to its square. Which of THAT square's 4 edges it
//     lies on is then unambiguous (they are 90 degrees apart), so each piece's
//     image-side X offset is set directly to base + the projection of the
//     piece's texture-origin endpoint along the ideal edge from its start
//     corner. The origin endpoint is simply the one nearer the edge's start
//     corner - true for both linedef directions, so line flips from drawing/
//     stitching cannot break it. Adjacent pieces share endpoints, so their
//     columns meet exactly: the texture flows continuously across the cuts,
//     like using UDB's auto-align on every face. The inward (black) side
//     keeps its constant offset.
// ---------------------------------------------------------------------------
if (intersect) {
	var kOfFrame = {};
	for (var kf = 0; kf < squares; kf++) kOfFrame[makeName(frontSpec, kf)] = kf;

	var alnR = half * 1.4142136 + 4;
	var alnR2 = alnR * alnR;
	var alnLds = UDB.Map.getLinedefs();
	for (var ai = 0; ai < alnLds.length; ai++) {
		var Ld = alnLds[ai];
		var acp = Ld.getCenterPoint();
		var adx = acp.x - center.x, ady = acp.y - center.y;
		if (adx * adx + ady * ady > alnR2) continue;
		var aOnF = Ld.sideOfLine(center) < 0;
		var aOut = aOnF ? Ld.back : Ld.front;
		if (aOut == null) continue;
		var ak = kOfFrame[aOut.middleTexture];
		if (ak === undefined) continue;

		var IC = idealCornersByK[ak];
		var p1 = Ld.start.position, p2 = Ld.end.position;
		var pdx = p2.x - p1.x, pdy = p2.y - p1.y;
		var plen = Math.sqrt(pdx * pdx + pdy * pdy);
		if (plen === 0) continue;

		// Which edge? Pick the parallel PAIR by direction, then the edge of the
		// pair by the piece midpoint's perpendicular distance.
		var mpx = (p1.x + p2.x) / 2, mpy = (p1.y + p2.y) / 2;
		var cos0 = edgeCos(IC, 0, pdx, pdy, plen);
		var cos1 = edgeCos(IC, 1, pdx, pdy, plen);
		var eA = (cos0 >= cos1) ? 0 : 1;
		var eB = eA + 2;
		var eBest = (edgePerp(IC, eA, mpx, mpy) <= edgePerp(IC, eB, mpx, mpy)) ? eA : eB;

		// Offset = base + projection of the texture-origin endpoint (the one
		// nearer the edge's start corner) along the ideal edge.
		var A2 = IC[eBest], B2 = IC[(eBest + 1) % 4];
		var ex2 = B2[0] - A2[0], ey2 = B2[1] - A2[1];
		var el2 = Math.sqrt(ex2 * ex2 + ey2 * ey2);
		var ux2 = ex2 / el2, uy2 = ey2 / el2;
		var t1 = (p1.x - A2[0]) * ux2 + (p1.y - A2[1]) * uy2;
		var t2 = (p2.x - A2[0]) * ux2 + (p2.y - A2[1]) * uy2;
		aOut.offsetX = frontOffset[0] + Math.round(Math.min(t1, t2));
	}
}

// |cos| between a piece direction and edge e of the ideal corner set.
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

// ---------------------------------------------------------------------------
// 2) Bounding ring through every outer corner. Capture its linedefs so we can
//    leave them SELECTED at the very end (for the manual back-sector fix).
// ---------------------------------------------------------------------------
var ringLines = [];
if (!intersect && corners.length >= 3) {
	corners.sort(function (a, b) { return a.ang - b.ang; });

	var pts = [];
	for (var c = 0; c < corners.length; c++) {
		var cur = corners[c];
		if (pts.length > 0) {
			var p = pts[pts.length - 1];
			if (p[0] === cur.x && p[1] === cur.y) continue; // skip exact duplicate
		}
		pts.push([cur.x, cur.y]);
	}
	if (pts.length > 1 && pts[0][0] === pts[pts.length - 1][0] && pts[0][1] === pts[pts.length - 1][1])
		pts.pop();

	if (pts.length >= 3) {
		pts.push([pts[0][0], pts[0][1]]); // close the loop
		UDB.Map.clearAllMarks();
		if (!UDB.Map.drawLines(pts)) {
			UDB.log('Bounding ring failed to draw; squares are placed but not enclosed.');
		} else {
			var ringMarked = UDB.Map.getMarkedLinedefs(true);
			var rThresh = (half * 1.15) * (half * 1.15);
			for (var m = 0; m < ringMarked.length; m++) {
				var rcp = ringMarked[m].getCenterPoint();
				var rdx = rcp.x - center.x, rdy = rcp.y - center.y;
				if ((rdx * rdx + rdy * rdy) >= rThresh)
					ringLines.push(ringMarked[m]);
			}
		}
	}
}

// ---------------------------------------------------------------------------
// 3) Texture the square lines: Front Texture outward, Back Texture inward
//    (Back blank -> mirror Front). (+1087 if Elf Lines is on.)
// ---------------------------------------------------------------------------
for (var s = 0; s < squareLines.length; s++) {
	var ld = squareLines[s].ld;
	var sqK = squareLines[s].k;
	ld.applySidedFlags();
	if (elfLines)
		ld.action = 1087; // ELFBSP "do not split segment" - inert in-game

	var frontName = makeName(frontSpec, sqK);
	var backName = (backSpec != null) ? makeName(backSpec, sqK) : frontName;

	var centerOnFront = ld.sideOfLine(center) < 0; // <0 = center on front(right) side
	var outward = centerOnFront ? ld.back : ld.front;
	var inward = centerOnFront ? ld.front : ld.back;

	if (outward != null) {
		outward.middleTexture = frontName;
		outward.offsetX = frontOffset[0];
		outward.offsetY = frontOffset[1];
	}
	if (inward != null) {
		inward.middleTexture = backName;
		inward.offsetX = backOffset[0];
		inward.offsetY = backOffset[1];
	}
}

// ---------------------------------------------------------------------------
// 4) Software fix (optional): a backing that conforms to the inner space (the
//    intersection of the squares = a regular 4*Number-gon with flat sides on the
//    square edges, apothem = half). Match it: 4*Number sides, apothem half-1 so
//    the sides sit 1mu inside (parallel to) the square edges, vertices offset
//    half a step so an edge runs along each square edge. Drawn NORMALLY, last.
// ---------------------------------------------------------------------------
if (softwareFix) {
	var sides = 4 * squares;
	var apothem = half - 1;
	if (apothem < 1) apothem = half;
	var fstep = (2 * Math.PI) / sides;
	var Rc = apothem / Math.cos(fstep / 2); // circumradius from apothem
	var startAng = fstep / 2;               // offset so edges (not corners) align with squares

	var fixPts = [];
	var lastX = null, lastY = null;
	for (var o = 0; o < sides; o++) {
		var fa = startAng + o * fstep;
		var fx = center.x + Math.round(Rc * Math.cos(fa));
		var fy = center.y + Math.round(Rc * Math.sin(fa));
		if (fx === lastX && fy === lastY) continue; // dedupe consecutive after rounding
		fixPts.push([fx, fy]);
		lastX = fx; lastY = fy;
	}

	if (fixPts.length >= 3) {
		fixPts.push([fixPts[0][0], fixPts[0][1]]); // close
		UDB.Map.clearAllMarks();
		if (!UDB.Map.drawLines(fixPts)) {
			UDB.log('Software-fix backing failed to draw.');
		} else {
			var fixLines = UDB.Map.getMarkedLinedefs(true);
			for (var q = 0; q < fixLines.length; q++) {
				var fld = fixLines[q];
				fld.applySidedFlags();
				if (elfLines)
					fld.action = 1087;

				var fOnFront = fld.sideOfLine(center) < 0;
				var fOut = fOnFront ? fld.back : fld.front;
				var fIn = fOnFront ? fld.front : fld.back;

				if (fixTexture.length > 0) {
					if (fOut != null) {
						fOut.middleTexture = fixTexture;
						fOut.offsetX = frontOffset[0];
						fOut.offsetY = frontOffset[1];
					}
					if (fIn != null) {
						fIn.middleTexture = fixTexture;
						fIn.offsetX = backOffset[0];
						fIn.offsetY = backOffset[1];
					}
				}
			}
		}
	}
}

// ---------------------------------------------------------------------------
// 5) Select the ring linedefs (last), so the manual back-sector fix is one
//    right-click. Done after the software fix so nothing disturbs the selection.
// ---------------------------------------------------------------------------
var ringSelected = 0;
for (var r = 0; r < ringLines.length; r++) {
	ringLines[r].selected = true;
	ringSelected++;
}

// ---------------------------------------------------------------------------
// Drop a single unattached vertex at the exact center as a snapping handle
// for moving the whole structure later.
// ---------------------------------------------------------------------------
UDB.Map.createVertex([center.x, center.y]);

UDB.Map.snapAllToAccuracy(false);
UDB.exit(squares + ' squares placed at (' + center.x + ', ' + center.y + ')'
	+ (softwareFix ? ' + inner-space backing' : '')
	+ (elfLines ? ' [1087]' : '') + '. '
	+ (intersect
		? 'Intersect mode: drawn in place, tips bonded to the room - no ring, no manual fix needed.'
		: (ringSelected > 0
			? (ringSelected + ' ring lines selected - set their BACK side sector to the room sector and apply.')
			: 'No ring lines to select.'))
	+ ' Center snap vertex added.');