`#version 5`;
`#name Chevron Closet - Apply Teleports`;
`#description Finds all linedef special 126 lines in selected sectors and distributes specified tags across them evenly and randomly.`;

`#scriptoptions

tagList
{
	description = "Tags (e.g. 1-3, 5, 9, 20-25)";
	default = "";
	type = 2;
}

teleportType
{
	description = "Teleport Line Type";
	default = 126;
	type = 0;
}
`;

// ── Get selected sectors ──────────────────────────────────────────────────────
const selectedSectors = UDB.Map.getSelectedSectors();

if (selectedSectors.length === 0) {
    UDB.die('No sectors selected. Please select the chevron closet sectors first.');
}

const TELE_TYPE = UDB.ScriptOptions.teleportType;

// ── Parse tag list ────────────────────────────────────────────────────────────
const tagInput = UDB.ScriptOptions.tagList.trim();

if (tagInput === '') {
    UDB.die('No tags specified. Please enter tags in the options field.');
}

const tags = [];
const parts = tagInput.split(',');

for (let i = 0; i < parts.length; i++) {
    const part = parts[i].trim();
    if (part.indexOf('-') !== -1) {
        const rangeParts = part.split('-');
        const start = parseInt(rangeParts[0].trim(), 10);
        const end   = parseInt(rangeParts[1].trim(), 10);
        if (!isNaN(start) && !isNaN(end)) {
            for (let t = start; t <= end; t++) {
                tags.push(t);
            }
        }
    } else {
        const num = parseInt(part, 10);
        if (!isNaN(num)) {
            tags.push(num);
        }
    }
}

if (tags.length === 0) {
    UDB.die('No valid tags found in the input. Please check the format.');
}

// ── Find all teleport linedefs in selected sectors ────────────────────────────
const seen = [];
const targetLinedefs = [];

for (let i = 0; i < selectedSectors.length; i++) {
    const sidedefs = selectedSectors[i].getSidedefs();
    for (let j = 0; j < sidedefs.length; j++) {
        const ld = sidedefs[j].line;
        if (ld.action === TELE_TYPE && seen.indexOf(ld.index) === -1) {
            seen.push(ld.index);
            targetLinedefs.push(ld);
        }
    }
}

if (targetLinedefs.length === 0) {
    UDB.die('No linedef special ' + TELE_TYPE + ' found in the selected sectors.');
}

if (targetLinedefs.length < tags.length) {
    UDB.die('Fewer linedefs (' + targetLinedefs.length + ') than tags (' + tags.length + '). Nothing applied.');
}

// ── Build evenly distributed tag assignment array ────────────────────────────
// Each tag gets Math.floor(lineCount / tagCount) assignments,
// then the remainder tags get one extra assignment.
const lineCount = targetLinedefs.length;
const tagCount  = tags.length;
const base      = Math.floor(lineCount / tagCount);
const extra     = lineCount % tagCount;

const assignment = [];
for (let i = 0; i < tagCount; i++) {
    const count = base + (i < extra ? 1 : 0);
    for (let j = 0; j < count; j++) {
        assignment.push(tags[i]);
    }
}

// ── Fisher-Yates shuffle ──────────────────────────────────────────────────────
for (let i = assignment.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = assignment[i];
    assignment[i] = assignment[j];
    assignment[j] = temp;
}

// ── Apply tags to linedefs ────────────────────────────────────────────────────
for (let i = 0; i < targetLinedefs.length; i++) {
    targetLinedefs[i].tag = assignment[i];
}

UDB.exit('Applied ' + tags.length + ' tags across ' + targetLinedefs.length + ' teleport linedefs.');