`#version 5`;

`#name Place Voodoo Doll`;

`#description Place a Voodoo Doll\n* At Mouse Cursor (snapped to grid)\n* At Centre of selected sector\n* At selected vertex`;

`#scriptoptions

direction
{
	description = "Facing direction";
	default = 4;
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

const DIRECTION_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];

function getAngle() {
	const dir = UDB.ScriptOptions.direction;
	if (dir === 8) {
		return DIRECTION_ANGLES[Math.floor(Math.random() * 8)];
	}
	return DIRECTION_ANGLES[dir];
}

function placeVoodooDoll(pos) {
	const angle = getAngle();
	const allPlayer1s = UDB.Map.getThings().filter(t => t.type === PLAYER1_TYPE);

	if (allPlayer1s.length > 0) {
		const highestThing = allPlayer1s.sort((a, b) => b.index - a.index)[0];

		const oldPos   = highestThing.position;
		const oldAngle = highestThing.angle;

		highestThing.position = pos;
		highestThing.angle = angle;
		highestThing.snapToAccuracy();

		const newThing = UDB.Map.createThing(new UDB.Vector2D(oldPos.x, oldPos.y), PLAYER1_TYPE);
		newThing.angle = oldAngle;
	} else {
		const newThing = UDB.Map.createThing(pos, PLAYER1_TYPE);
		newThing.angle = angle;
	}
}

function placeAtCursor() {
	const mousePos = UDB.Map.mousePosition;
	if (isNaN(mousePos.x) || isNaN(mousePos.y)) { UDB.exit(); }
	const snapped = UDB.Map.snappedToGrid(mousePos);
	if (isNaN(snapped.x) || isNaN(snapped.y)) { UDB.exit(); }
	placeVoodooDoll(new UDB.Vector2D(snapped.x, snapped.y));
	UDB.exit();
}

// ── Single sector selected — place at label position, snapped to 1mu ──────

const selectedSectors = UDB.Map.getSelectedSectors();

if (selectedSectors.length === 1) {
	const positions = selectedSectors[0].getLabelPositions();
	if (positions.length === 0) { placeAtCursor(); }
	const p = positions[0];
	placeVoodooDoll(new UDB.Vector2D(Math.round(p.x), Math.round(p.y)));
	UDB.exit();
}

// ── Single vertex selected — place at vertex position, snapped to 1mu ─────

const selectedVertices = UDB.Map.getSelectedVertices();

if (selectedVertices.length === 1) {
	const vp = selectedVertices[0].position;
	placeVoodooDoll(new UDB.Vector2D(Math.round(vp.x), Math.round(vp.y)));
	UDB.exit();
}

// ── Anything else — fall through to cursor ─────────────────────────────────

placeAtCursor();