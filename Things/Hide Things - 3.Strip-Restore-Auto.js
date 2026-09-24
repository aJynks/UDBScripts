`#version 5`;

`#name Hide Things - 3.Strip-Restore-Auto`;

`#description Hotkey toggle. If the "data" option is empty or invalid, strips things exactly like Hide Things - 1.Strip (selected things and/or things in selected sectors, or the whole map; Player 1 starts and teleport destinations are never stripped) and prints the data string to the log. If the option holds a valid string, the selection is ignored: the saved things are removed if they are in the map, otherwise they are restored at their original indices.`;

`#scriptoptions

data
{
    description = "Strip data string (paste the log contents)";
    default = "";
    type = 2;
}
`;

// ---------------------------------------------------------------------------
// Hide Things - 3.Strip-Restore-Auto - MBF21
// Data:   TS2|<count b36>|<checksum b36>|<records>
// Record: index,type,x,y,angle,flags   (each base36, records joined by ';')
// Same format as Hide Things - 1.Strip; strings work in scripts 2, 3 and 4.
//
// The API can only append things, and deleting can reorder what's left, so
// every change deletes all things and rebuilds the list in order.
// ---------------------------------------------------------------------------

const TS_VERSION = 'TS2';
// Thing types that are never stripped: 1 = Player 1 start, 14 = Teleport destination
const TS_PROTECTED = { 1: true, 14: true };

// FNV-1a 32-bit hash - must match Hide Things 1, 2 and 4
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

// Parse a data string; returns sorted records, or null if empty/invalid
function tsParse(text) {
    const raw = String(text || '').replace(/\s+/g, '').toLowerCase();
    const m = raw.match(/ts2\|[0-9a-z]+\|[0-9a-z]+\|[0-9a-z,;\-]*/);
    if (!m) return null;

    const parts = m[0].split('|');
    if (parts.length !== 4) return null;

    const num = /^-?[0-9a-z]+$/;
    if (!num.test(parts[1]) || !num.test(parts[2])) return null;

    const count = parseInt(parts[1], 36);
    const sum   = parseInt(parts[2], 36);
    const body  = parts[3];

    if ((tsChecksum(body) >>> 0) !== (sum >>> 0)) return null;

    const recs = body.length ? body.split(';') : [];
    if (recs.length !== count || count === 0) return null;

    const out = [];
    for (const rec of recs) {
        const f = rec.split(',');
        if (f.length !== 6) return null;
        for (const v of f) if (!num.test(v)) return null;
        const n = f.map(v => parseInt(v, 36));
        out.push({ index: n[0], type: n[1], x: n[2], y: n[3], angle: n[4], flags: n[5] });
    }
    return out.sort((a, b) => a.index - b.index);
}

// --- Snapshot (index order) ----------------------------------------------------

const tsThings = UDB.Map.getThings().slice().sort((a, b) => a.index - b.index);

const tsAll = tsThings.map(t => ({
    index: t.index,
    type:  t.type,
    x:     Math.round(t.position.x),
    y:     Math.round(t.position.y),
    angle: Math.round(t.angle),
    flags: tsReadFlags(t)
}));

const tsSaved = tsParse(UDB.ScriptOptions.data);

if (tsSaved) {
    // =========================================================================
    // TOGGLE MODE - valid data in the option; selection is ignored
    // =========================================================================

    // Present = every saved thing sits at its original index, unchanged
    const tsPresent = tsSaved.every(r => {
        const c = tsAll[r.index];
        return c && c.type === r.type && c.x === r.x && c.y === r.y &&
               c.angle === r.angle && c.flags === r.flags;
    });

    let tsResult;

    if (tsPresent) {
        // Remove them
        const drop = {};
        tsSaved.forEach(r => { drop[r.index] = true; });
        tsResult = tsAll.filter(r => !drop[r.index]);
    } else {
        // Add them back at their original indices, lowest first
        tsResult = tsAll.slice();
        for (const r of tsSaved)
            tsResult.splice(Math.min(r.index, tsResult.length), 0, r);
    }

    tsThings.forEach(t => t.delete());
    tsResult.forEach(r => tsCreate(r));

} else {
    // =========================================================================
    // STRIP MODE - option empty or invalid; identical to Hide Things - 1.Strip
    // =========================================================================

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

    const tsBody = tsStripped.map(r =>
        [r.index, r.type, r.x, r.y, r.angle, r.flags].map(v => v.toString(36)).join(',')
    ).join(';');

    const tsData = TS_VERSION + '|' +
        tsStripped.length.toString(36) + '|' +
        tsChecksum(tsBody).toString(36) + '|' +
        tsBody;

    tsThings.forEach(t => t.delete());
    tsKept.forEach(r => tsCreate(r));

    // Log holds ONLY the data line
    UDB.log(tsData);
}
