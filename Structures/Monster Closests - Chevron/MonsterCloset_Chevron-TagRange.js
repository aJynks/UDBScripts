`#version 4`;
`#name MonsterCloset_Chess-TagRange.js`;
`#description Distributes a phrase of tags across selected walkover teleport linedefs.
Requires linedefs to be selected. Enter tags as a comma-separated phrase of single
values and inclusive ranges, e.g. "2,9,6,20-25" (= 2,9,6,20,21,22,23,24,25).
Reversed ranges like 25-20 expand descending. Whitespace is optional.

Selection Order: tags are de-duplicated (first occurrence, written order) and assigned
to lines in selection order, cycling the list if there are more lines than tags.

Random: the full tag list is kept as-is (duplicates act as weighting), shuffled, then
walked across the lines; when the shuffled list runs out it is reshuffled and the walk
continues, until every line has a tag.

Any invalid token, empty value, or tag <= 0 stops the script with a report.`;

`#scriptoptions

tagphrase
{
    description = "Tags (e.g. 2,9,6,20-25)";
    default = "1-10";
    type = 2;
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
const tagPhrase = UDB.ScriptOptions.tagphrase;
const randMode  = UDB.ScriptOptions.assignmode === 0; // 0 = random, 1 = ordered

// ── Parse the tag phrase ──────────────────────────────────────────────────────
// Comma-separated tokens; each token is a single value or an inclusive range x-y.
// Reversed ranges expand descending. Whitespace anywhere is optional. Produces an
// ordered list with duplicates preserved (dedupe happens later, only for ordered
// mode). Any malformed token or value <= 0 stops the script.
function parseTagPhrase(phrase) {
    if (phrase === null || phrase === undefined || String(phrase).trim() === '') {
        UDB.die('No tags entered. Provide something like "2,9,6,20-25".');
    }

    const result = [];
    const tokens = String(phrase).split(',');

    for (let raw of tokens) {
        const token = raw.trim();

        if (token === '') {
            UDB.die('Empty value in the tag phrase (check for a stray comma): "' + phrase + '"');
        }

        // Range "x-y" (with optional spaces around the hyphen)
        const rangeMatch = token.match(/^(\d+)\s*-\s*(\d+)$/);
        if (rangeMatch) {
            const a = parseInt(rangeMatch[1], 10);
            const b = parseInt(rangeMatch[2], 10);

            if (a <= 0 || b <= 0) {
                UDB.die('Tags must be greater than 0. Offending token: "' + token + '"');
            }

            if (a <= b) {
                for (let v = a; v <= b; v++) result.push(v);
            } else {
                for (let v = a; v >= b; v--) result.push(v);
            }
            continue;
        }

        // Single value
        const singleMatch = token.match(/^(\d+)$/);
        if (singleMatch) {
            const v = parseInt(singleMatch[1], 10);
            if (v <= 0) {
                UDB.die('Tags must be greater than 0. Offending token: "' + token + '"');
            }
            result.push(v);
            continue;
        }

        UDB.die('Could not parse "' + token + '" in the tag phrase. Use single values or x-y ranges.');
    }

    return result;
}

const parsedTags = parseTagPhrase(tagPhrase);

// ── Collect qualifying linedefs ───────────────────────────────────────────────
const allSelected = UDB.Map.getSelectedLinedefs(true);

if (allSelected.length === 0) {
    UDB.die('No linedefs are selected.');
}

const teleLines = allSelected.filter(ld => WALKOVER_TELEPORT_SPECIALS.has(ld.action));

if (teleLines.length === 0) {
    UDB.die('No selected linedefs have a walkover teleport special.');
}

const lineCount = teleLines.length;

// ── Helpers ───────────────────────────────────────────────────────────────────
function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = a[i];
        a[i] = a[j];
        a[j] = tmp;
    }
    return a;
}

// ── Build the per-line tag assignment ─────────────────────────────────────────
let assignedTagPerLine = new Array(lineCount);
let unusedTags = [];          // only reported when there are more tags than lines
let usedTagCount = parsedTags.length; // for the summary

if (randMode) {
    // Shuffle the full list, walk the lines pulling tags in order; when the bag
    // empties before the lines do, reshuffle the full list and keep going.
    let bag = [];
    for (let i = 0; i < lineCount; i++) {
        if (bag.length === 0) {
            bag = shuffle(parsedTags);
        }
        assignedTagPerLine[i] = bag.shift();
    }
    // If we never needed a second pass (lines <= tags), the bag's leftover are
    // tags that were never placed. With multiple passes there's no meaningful
    // "unused" set, so only report in the lines <= tags case.
    unusedTags = (lineCount <= parsedTags.length) ? bag.slice() : [];
} else {
    // Selection order: de-duplicate (first occurrence, written order).
    const seen = new Set();
    const uniqueTags = [];
    for (let t of parsedTags) {
        if (!seen.has(t)) {
            seen.add(t);
            uniqueTags.push(t);
        }
    }
    usedTagCount = uniqueTags.length;

    // Assign in selection order, cycling the unique list to cover extra lines.
    for (let i = 0; i < lineCount; i++) {
        assignedTagPerLine[i] = uniqueTags[i % uniqueTags.length];
    }
    // Fewer lines than unique tags -> the tail is never assigned.
    unusedTags = (lineCount < uniqueTags.length) ? uniqueTags.slice(lineCount) : [];
}

// ── Apply tags (teleLines is in selection order) ──────────────────────────────
for (let i = 0; i < lineCount; i++) {
    teleLines[i].tag = assignedTagPerLine[i];
}

// ── Summary ───────────────────────────────────────────────────────────────────
const modeLabel = randMode ? 'Random' : 'Selection Order';

let msg = `Done! (${modeLabel})\n`;
if (randMode) {
    msg += `Parsed tags: ${parsedTags.length} (duplicates kept as weighting)\n`;
} else {
    msg += `Parsed tags: ${parsedTags.length}, unique used: ${usedTagCount}\n`;
}
msg += `Qualifying lines: ${lineCount}`;

if (unusedTags.length > 0) {
    msg += `\nNot assigned (more tags than lines): ${unusedTags.join(', ')}`;
}

UDB.showMessage(msg);