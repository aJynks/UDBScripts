`#version 5`;

`#name Hide Things - 1.Strip`;

`#description Removes things and prints a data string to the log for Things Restore. Selected things and/or things inside selected sectors are stripped; with nothing selected (or only vertices/lines) every thing in the map is stripped. Player 1 starts and teleport destinations are never stripped. Thing index order is preserved.`;

// ---------------------------------------------------------------------------
// Things Strip - MBF21
// Output: TS2|<count b36>|<checksum b36>|<records>
// Record: index,type,x,y,angle,flags   (each base36, records joined by ';')
//
// The API can only append things, and deleting can reorder what's left, so
// every thing is deleted and the non-stripped ones are rebuilt in order.
// ---------------------------------------------------------------------------

const TS_VERSION = 'TS2';
// Thing types that are never stripped: 1 = Player 1 start, 14 = Teleport destination
const TS_PROTECTED = { 1: true, 14: true };

// FNV-1a 32-bit hash - must match Things Restore
function tsChecksum(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h >>> 0;
}

// Pack every set flag into one integer (config keys + bit sweep fallback)
function tsReadFlags(t) {
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

function tsCreate(r) {
    const t = UDB.Map.createThing([r.x, r.y], r.type);
    t.angle = r.angle;
    t.clearFlags();
    for (let bit = 1; bit <= 32768; bit <<= 1) {
        if (!(r.flags & bit)) continue;
        try { t.flags[String(bit)] = true; } catch (e) { /* bit not defined by config */ }
    }
}

// --- Snapshot (index order) --------------------------------------------------

const tsThings = UDB.Map.getThings().slice().sort((a, b) => a.index - b.index);

const tsAll = tsThings.map(t => ({
    index: t.index,
    type:  t.type,
    x:     Math.round(t.position.x),
    y:     Math.round(t.position.y),
    angle: Math.round(t.angle),
    flags: tsReadFlags(t)
}));

// --- Target set ----------------------------------------------------------------

const tsSelThings  = UDB.Map.getSelectedThings(true);
const tsSelSectors = UDB.Map.getSelectedSectors(true);
const tsTarget = {};   // original index -> true

if (tsSelThings.length === 0 && tsSelSectors.length === 0) {
    // Whole map
    tsThings.forEach(t => { tsTarget[t.index] = true; });
} else {
    // Union: selected things + things inside selected sectors
    tsSelThings.forEach(t => { tsTarget[t.index] = true; });

    if (tsSelSectors.length > 0) {
        const secSet = {};
        tsSelSectors.forEach(s => { secSet[s.index] = true; });
        tsThings.forEach(t => {
            let s = null;
            try { s = t.getSector(); } catch (e) { s = null; }
            if (s && secSet[s.index]) tsTarget[t.index] = true;
        });
    }
}

// Protected types are never stripped
tsAll.forEach(r => { if (TS_PROTECTED[r.type]) delete tsTarget[r.index]; });

const tsStripped = tsAll.filter(r => tsTarget[r.index]);
const tsKept     = tsAll.filter(r => !tsTarget[r.index]);

if (tsStripped.length === 0)
    UDB.exit('Nothing to strip.');

// --- Encode --------------------------------------------------------------------

const tsBody = tsStripped.map(r =>
    [r.index, r.type, r.x, r.y, r.angle, r.flags].map(v => v.toString(36)).join(',')
).join(';');

const tsData = TS_VERSION + '|' +
    tsStripped.length.toString(36) + '|' +
    tsChecksum(tsBody).toString(36) + '|' +
    tsBody;

// --- Rebuild -------------------------------------------------------------------

tsThings.forEach(t => t.delete());
tsKept.forEach(r => tsCreate(r));

// --- Output (log holds ONLY the data line) -------------------------------------

UDB.log(tsData);
