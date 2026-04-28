`#version 4`;
`#name MonsterCloset_Chess-TagRange.js`;
`#description Distributes a range of tags evenly across selected walkover teleport linedefs.
Requires linedefs to be selected. Set Start and End to define the tag range (inclusive).
Tags are distributed as evenly as possible — if lines don't divide evenly, some tags
get one extra line assigned. Order mode controls whether assignment is random or
follows selection index order.`;

`#scriptoptions

tagstart
{
    description = "Start Tag";
    default = 1;
    type = 15;
}

tagend
{
    description = "End Tag";
    default = 10;
    type = 15;
}

assignmode
{
    description = "Assignment Order";
    default = 0;
    type = 11;
    enumvalues
    {
        0 = "Random";
        1 = "Selection Order";
    }
}
`;

// ── Walkover teleport specials ────────────────────────────────────────────────
// Sourced from Boom + MBF references (all W1/WR trigger variants):
//   39  W1 TP thing in tagged sector  (players+monsters, noisy)
//   97  WR TP thing in tagged sector  (players+monsters, noisy)
//  125  W1 TP thing in tagged sector  (monsters only, noisy)
//  126  WR TP thing in tagged sector  (monsters only, noisy)
//  207  W1 silent TP thing (preserve orient, players+monsters)
//  208  WR silent TP thing (preserve orient, players+monsters)
//  243  W1 silent line-to-line TP (preserve orient, players+monsters)
//  244  WR silent line-to-line TP (preserve orient, players+monsters)
//  262  W1 silent line-to-line TP reversed (preserve orient, players+monsters)
//  263  WR silent line-to-line TP reversed (preserve orient, players+monsters)
//  264  W1 silent line-to-line TP reversed (preserve orient, monsters only)
//  265  WR silent line-to-line TP reversed (preserve orient, monsters only)
//  266  W1 silent line-to-line TP (preserve orient, monsters only)
//  267  WR silent line-to-line TP (preserve orient, monsters only)
//  268  W1 silent TP thing (monsters only)
//  269  WR silent TP thing (monsters only)
const WALKOVER_TELEPORT_SPECIALS = new Set([
    39, 97, 125, 126,
    207, 208,
    243, 244,
    262, 263, 264, 265, 266, 267, 268, 269
]);

// ── Read options ──────────────────────────────────────────────────────────────
const tagStart  = UDB.ScriptOptions.tagstart;
const tagEnd    = UDB.ScriptOptions.tagend;
const randMode  = UDB.ScriptOptions.assignmode === 0; // 0 = random, 1 = ordered

if (tagEnd < tagStart) {
    UDB.die('End Tag must be >= Start Tag.');
}

// ── Collect qualifying linedefs ───────────────────────────────────────────────
const allSelected = UDB.Map.getSelectedLinedefs(true);

if (allSelected.length === 0) {
    UDB.die('No linedefs are selected.');
}

const teleLines = allSelected.filter(ld => WALKOVER_TELEPORT_SPECIALS.has(ld.action));

if (teleLines.length === 0) {
    UDB.die('No selected linedefs have a walkover teleport special.');
}

// ── Build tag list ────────────────────────────────────────────────────────────
const tags = [];
for (let t = tagStart; t <= tagEnd; t++) {
    tags.push(t);
}

const tagCount  = tags.length;
const lineCount = teleLines.length;

// ── Distribute: work out how many lines each tag gets ────────────────────────
// We're assigning tags → lines, so we need lineCount slots spread across tagCount tags.
// Each tag gets at least Math.floor(lineCount / tagCount) lines.
// The remainder tags each get one extra line.
const basePerTag    = Math.floor(lineCount / tagCount);
const extrasNeeded  = lineCount % tagCount; // this many tags get (basePerTag + 1) lines

// Build a flat assignment list: index = line slot → tag value
// Tags with extras come first (could be randomised tag order too, but spec says
// lines are randomised, not tags, so we keep tag order stable).
const tagAssignment = []; // tagAssignment[lineIndex] = tag
for (let i = 0; i < tagCount; i++) {
    const count = (i < extrasNeeded) ? basePerTag + 1 : basePerTag;
    for (let j = 0; j < count; j++) {
        tagAssignment.push(tags[i]);
    }
}
// tagAssignment.length === lineCount at this point

// ── Shuffle lines if random mode ──────────────────────────────────────────────
let orderedLines = teleLines.slice(); // copy so we don't mutate the original array

if (randMode) {
    // Fisher-Yates shuffle
    for (let i = orderedLines.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = orderedLines[i];
        orderedLines[i] = orderedLines[j];
        orderedLines[j] = tmp;
    }
}

// ── Apply tags ────────────────────────────────────────────────────────────────
for (let i = 0; i < orderedLines.length; i++) {
    orderedLines[i].tag = tagAssignment[i];
}

// ── Summary ───────────────────────────────────────────────────────────────────
const modeLabel = randMode ? 'Random' : 'Selection Order';
const extraMsg  = extrasNeeded > 0
    ? `\n${extrasNeeded} tag(s) assigned to ${basePerTag + 1} line(s), ${tagCount - extrasNeeded} tag(s) assigned to ${basePerTag} line(s).`
    : `\nAll ${tagCount} tags assigned to exactly ${basePerTag} line(s).`;

UDB.showMessage(
    `Done! (${modeLabel})\n` +
    `Tags: ${tagStart}–${tagEnd} (${tagCount} tags)\n` +
    `Qualifying lines: ${lineCount}` +
    extraMsg
);