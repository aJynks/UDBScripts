`#version 5`;

`#name Hide Things - 2.Restore`;

`#description Run, then paste the Things Strip data into the input window and press OK. Puts every stripped thing back at its original index with type, position, facing and all flags. Things currently in the map are left as they are.`;

// ---------------------------------------------------------------------------
// Things Restore - MBF21
// Input:  TS2|<count b36>|<checksum b36>|<records>
// Record: index,type,x,y,angle,flags   (each base36, records joined by ';')
//
// Saved things are slotted back into the current thing list at their original
// indices (lowest first), then every thing is deleted and the merged list is
// rebuilt in order.
// ---------------------------------------------------------------------------

const TR_VERSION = 'TS2';

// FNV-1a 32-bit hash - must match Things Strip
function trChecksum(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h >>> 0;
}

function trParse36(s, what, recNo) {
    if (!/^-?[0-9a-z]+$/.test(s))
        UDB.die('Bad ' + what + ' value "' + s + '" in record ' + recNo + '. Map not changed.');
    return parseInt(s, 36);
}

// Pack every set flag into one integer (config keys + bit sweep fallback)
function trReadFlags(t) {
    let bits = 0;
    let keys = [];
    try { keys = Object.keys(t.flags); } catch (e) { keys = []; }
    for (let bit = 1; bit <= 32768; bit <<= 1) keys.push(String(bit));

    const seen = {};
    for (const k of keys) {
        if (seen[k]) continue;
        seen[k] = true;
        const n = parseInt(k, 10);
        if (isNaN(n) || String(n) !== k || n <= 0) continue;
        let on = false;
        try { on = t.flags[k] === true; } catch (e) { on = false; }
        if (on) bits |= n;
    }
    return bits >>> 0;
}

function trCreate(r) {
    const t = UDB.Map.createThing([r.x, r.y], r.type);
    t.angle = r.angle;
    t.clearFlags();
    for (let bit = 1; bit <= 32768; bit <<= 1) {
        if (!(r.flags & bit)) continue;
        try { t.flags[String(bit)] = true; } catch (e) { /* bit not defined by config */ }
    }
}

// --- Input ---------------------------------------------------------------------

const trQuery = new UDB.QueryOptions();
trQuery.addOption('data', 'Things Strip data (paste the log contents)', 2, '');
if (!trQuery.query())
    UDB.exit();

// --- Validate (nothing touches the map until this passes) ----------------------

// Strip all whitespace so line wraps / stray spaces from copy-paste don't matter
const trRaw = String(trQuery.options.data || '').replace(/\s+/g, '').toLowerCase();

if (trRaw.length === 0)
    UDB.die('No data entered. Map not changed.');

// Locate the data block anywhere in the paste; ignore any text before/after it
const trMatch = trRaw.match(/ts2\|[0-9a-z]+\|[0-9a-z]+\|[0-9a-z,;\-]*/);
if (!trMatch)
    UDB.die('No ' + TR_VERSION + ' data found in the pasted text. Map not changed.');

const trParts = trMatch[0].split('|');
if (trParts.length !== 4)
    UDB.die('Data string is malformed (expected 4 sections separated by "|"). Map not changed.');

const trCount = trParse36(trParts[1], 'count', 0);
const trSum   = trParse36(trParts[2], 'checksum', 0);
const trBody  = trParts[3];

if ((trChecksum(trBody) >>> 0) !== (trSum >>> 0))
    UDB.die('Checksum mismatch - the data is truncated or corrupted. Map not changed.');

const trRecords = trBody.length ? trBody.split(';') : [];
if (trRecords.length !== trCount)
    UDB.die('Record count mismatch (header says ' + trCount + ', found ' + trRecords.length + '). Map not changed.');

const trSaved = trRecords.map((rec, i) => {
    const f = rec.split(',');
    if (f.length !== 6)
        UDB.die('Record ' + (i + 1) + ' has ' + f.length + ' fields (expected 6). Map not changed.');
    return {
        index: trParse36(f[0], 'index', i + 1),
        type:  trParse36(f[1], 'type',  i + 1),
        x:     trParse36(f[2], 'x',     i + 1),
        y:     trParse36(f[3], 'y',     i + 1),
        angle: trParse36(f[4], 'angle', i + 1),
        flags: trParse36(f[5], 'flags', i + 1)
    };
}).sort((a, b) => a.index - b.index);

// --- Merge ---------------------------------------------------------------------

const trThings = UDB.Map.getThings().slice().sort((a, b) => a.index - b.index);

const trMerged = trThings.map(t => ({
    type:  t.type,
    x:     Math.round(t.position.x),
    y:     Math.round(t.position.y),
    angle: Math.round(t.angle),
    flags: trReadFlags(t)
}));

// Insert lowest original index first so each lands in its original slot
for (const r of trSaved)
    trMerged.splice(Math.min(r.index, trMerged.length), 0, r);

// --- Rebuild -------------------------------------------------------------------

trThings.forEach(t => t.delete());
trMerged.forEach(r => trCreate(r));
