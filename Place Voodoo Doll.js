`#version 5`;

`#name Place Voodoo Doll`;

`#description Place a Voodoo Doll\n* At Mouse Cursor\n* At Centre of selected sector`;

`#scriptoptions

direction
{
	description = "Facing direction";
	default = 8;
	type = 11;
	enumvalues {
		0 = "East";
		1 = "North-East";
		2 = "North";
		3 = "North-West";
		4 = "West";
		5 = "South-West";
		6 = "South";
		7 = "South-East";
		8 = "Random";
	}
}
`;

const PLAYER1_TYPE = 1;

// ── Direction angles ───────────────────────────────────────────────────────

const DIRECTION_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];

function getAngle() {
	const dir = UDB.ScriptOptions.direction;
	if (dir === 8) {
		return DIRECTION_ANGLES[Math.floor(Math.random() * 8)];
	}
	return DIRECTION_ANGLES[dir];
}

// ── Place a Player 1 thing at the given position ───────────────────────────
// If a Player 1 thing already exists:
//   - Find the highest-index one (current spawn point)
//   - Move it to the new position (becomes voodoo doll)
//   - Create a new thing at its old position (gets highest index, becomes spawn)
// If no Player 1 thing exists:
//   - Just create one at the target position

function placeVoodooDoll(pos) {
	const angle = getAngle();
	const allPlayer1s = UDB.Map.getThings().filter(t => t.type === PLAYER1_TYPE);

	if (allPlayer1s.length > 0) {
		// Get the highest-index Player 1 thing — this is the current spawn point
		const highestThing = allPlayer1s.sort((a, b) => b.index - a.index)[0];

		const oldPos   = highestThing.position;
		const oldAngle = highestThing.angle;

		// Move it to the new position — it becomes the voodoo doll
		highestThing.position = pos;
		highestThing.angle = angle;
		highestThing.snapToAccuracy();

		// Create a new thing at the old position — gets highest index, becomes spawn
		const newThing = UDB.Map.createThing([oldPos.x, oldPos.y], PLAYER1_TYPE);
		newThing.angle = oldAngle;
	} else {
		// No existing Player 1 — just place one
		const newThing = UDB.Map.createThing(pos, PLAYER1_TYPE);
		newThing.angle = angle;
	}
}

// ── Sectors are the primary signal ────────────────────────────────────────

const selectedSectors = UDB.Map.getSelectedSectors();

if (selectedSectors.length === 1) {
	const sector = selectedSectors[0];
	const sidedefs = sector.getSidedefs();

	if (sidedefs.length === 0) {
		UDB.showMessage('ERROR: Could not find any sidedefs for the selected sector.');
		UDB.die();
	}

	const seenIndices = {};
	const verts = [];

	for (let i = 0; i < sidedefs.length; i++) {
		const ld = sidedefs[i].line;
		const v1 = ld.start;
		const v2 = ld.end;

		if (!seenIndices[v1.index]) { seenIndices[v1.index] = true; verts.push(v1); }
		if (!seenIndices[v2.index]) { seenIndices[v2.index] = true; verts.push(v2); }
	}

	let sumX = 0, sumY = 0;
	for (let i = 0; i < verts.length; i++) {
		sumX += verts[i].position.x;
		sumY += verts[i].position.y;
	}

	// Snap to 1x1 grid (round to nearest integer) to preserve true mathematical centre
	const cx = Math.round(sumX / verts.length);
	const cy = Math.round(sumY / verts.length);
	const centroid = new UDB.Vector2D(cx, cy);
	placeVoodooDoll(centroid);
	UDB.showMessage('Voodoo doll placed at (' + cx + ', ' + cy + ').');
	UDB.exit();
}

if (selectedSectors.length > 1) {
	UDB.showMessage(
		'ERROR: Cannot place Voodoo Doll.\n' +
		selectedSectors.length + ' sectors are selected.\n' +
		'Please select exactly one sector, or deselect all for cursor placement.'
	);
	UDB.die();
}

// ── No sectors — check for invalid selection types ─────────────────────────

const selectedLinedefs = UDB.Map.getSelectedLinedefs();
const selectedVertices = UDB.Map.getSelectedVertices();

if (selectedLinedefs.length > 0) {
	UDB.showMessage(
		'ERROR: Cannot place Voodoo Doll.\n' +
		'Linedefs are selected. Switch to Sectors mode and select a single sector,\n' +
		'or deselect everything for cursor placement.'
	);
	UDB.die();
}

if (selectedVertices.length > 0) {
	UDB.showMessage(
		'ERROR: Cannot place Voodoo Doll.\n' +
		'Vertices are selected. Switch to Sectors mode and select a single sector,\n' +
		'or deselect everything for cursor placement.'
	);
	UDB.die();
}

// ── Nothing selected — place at cursor snapped to grid ─────────────────────

const mousePos = UDB.Map.mousePosition;

if (isNaN(mousePos.x) || isNaN(mousePos.y)) {
	UDB.showMessage(
		'ERROR: No selection and no cursor position available.\n' +
		'For cursor placement this script must be run via a hotkey\n' +
		'with the cursor over the map, not via the docker Run button.'
	);
	UDB.die();
}

const snapped = UDB.Map.snappedToGrid(mousePos);
placeVoodooDoll(snapped);
UDB.showMessage('Voodoo doll placed at (' + snapped.x + ', ' + snapped.y + ').');
UDB.exit();