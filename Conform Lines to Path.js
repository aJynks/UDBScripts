`#version 4`;

`#name Conform Lines to Path`;

`#description Conforms selected linedefs to a path defined by tagged linedefs, creating evenly-spaced segments that copy source linedef properties.`;

`#scriptoptions

pathTag
{
    description = "Path Tag (linedefs with this tag define the path shape)";
    type = 0; // Integer
    default = 1;
}

deleteSource
{
    description = "Delete Source Lines After Conforming";
    type = 3; // Bool
    default = true;
}

internalPath
{
    description = "Internal Path (clear textures, set impassable/hidden flags)";
    type = 3; // Bool
    default = true;
}

`;

// Get selected linedefs (source lines) - order matters!
let sourceLinedefs = UDB.Map.getSelectedLinedefs();

if (sourceLinedefs.length === 0) {
    UDB.showMessage("Error: No linedefs selected.\nPlease select the source linedefs you want to conform to a path.");
    UDB.die();
}

let targetPathTag = UDB.ScriptOptions.pathTag;
let shouldDeleteSource = UDB.ScriptOptions.deleteSource;
let isInternalPath = UDB.ScriptOptions.internalPath;

// Find path linedefs (ALL linedefs with the specified tag form the path)
let allMapLinedefs = UDB.Map.getLinedefs();
let targetPathLinedefs = allMapLinedefs.filter(ld => ld.tag === targetPathTag);

if (targetPathLinedefs.length === 0) {
    UDB.showMessage(`Error: No linedefs found with tag ${targetPathTag}.\nPlease tag linedefs to define the path shape.`);
    UDB.die();
}

// Separate into disconnected path groups
let pathGroups = [];
let remainingLines = [...targetPathLinedefs];

while (remainingLines.length > 0) {
    let currentGroup = [];
    let toCheck = [remainingLines[0]];
    remainingLines.splice(0, 1);
    
    while (toCheck.length > 0) {
        let current = toCheck.pop();
        currentGroup.push(current);
        
        // Find all connected linedefs
        for (let i = remainingLines.length - 1; i >= 0; i--) {
            let other = remainingLines[i];
            if (current.start === other.start || current.start === other.end ||
                current.end === other.start || current.end === other.end) {
                toCheck.push(other);
                remainingLines.splice(i, 1);
            }
        }
    }
    
    pathGroups.push(currentGroup);
}

// Build vertices and calculate length for each path group
let pathData = [];
let totalLength = 0;

for (let group of pathGroups) {
    // Order linedefs in this group
    let ordered = [group[0]];
    let unordered = group.slice(1);
    
    while (unordered.length > 0) {
        let found = false;
        let endVert = ordered[ordered.length - 1].end;
        let startVert = ordered[0].start;
        
        for (let i = 0; i < unordered.length; i++) {
            let ld = unordered[i];
            if (ld.start === endVert || ld.end === endVert) {
                ordered.push(ld);
                unordered.splice(i, 1);
                found = true;
                break;
            }
        }
        
        if (!found) {
            for (let i = 0; i < unordered.length; i++) {
                let ld = unordered[i];
                if (ld.start === startVert || ld.end === startVert) {
                    ordered.unshift(ld);
                    unordered.splice(i, 1);
                    found = true;
                    break;
                }
            }
        }
        
        if (!found && unordered.length > 0) {
            ordered.push(unordered[0]);
            unordered.splice(0, 1);
        }
    }
    
    // Build vertex list
    let verts = [];
    for (let i = 0; i < ordered.length; i++) {
        let ld = ordered[i];
        
        if (i === 0) {
            verts.push({x: ld.start.position.x, y: ld.start.position.y});
            verts.push({x: ld.end.position.x, y: ld.end.position.y});
        } else {
            let last = verts[verts.length - 1];
            let startDist = Math.sqrt(Math.pow(ld.start.position.x - last.x, 2) + 
                                     Math.pow(ld.start.position.y - last.y, 2));
            let endDist = Math.sqrt(Math.pow(ld.end.position.x - last.x, 2) + 
                                   Math.pow(ld.end.position.y - last.y, 2));
            
            if (startDist < endDist) {
                verts.push({x: ld.end.position.x, y: ld.end.position.y});
            } else {
                verts.push({x: ld.start.position.x, y: ld.start.position.y});
            }
        }
    }
    
    // Calculate path length
    let pathLen = 0;
    for (let i = 0; i < verts.length - 1; i++) {
        let dx = verts[i + 1].x - verts[i].x;
        let dy = verts[i + 1].y - verts[i].y;
        pathLen += Math.sqrt(dx * dx + dy * dy);
    }
    
    pathData.push({
        linedefs: ordered,
        vertices: verts,
        length: pathLen
    });
    
    totalLength += pathLen;
}

// Distribute segments across paths proportional to their lengths
let totalSegments = sourceLinedefs.length;
let segmentsPerPath = [];
let assignedSegments = 0;

for (let i = 0; i < pathData.length; i++) {
    let ratio = pathData[i].length / totalLength;
    let segs = Math.round(ratio * totalSegments);
    
    // Last path gets any remaining segments
    if (i === pathData.length - 1) {
        segs = totalSegments - assignedSegments;
    }
    
    segmentsPerPath.push(segs);
    assignedSegments += segs;
}

// Validate minimum segment length
let minSegLen = Infinity;
for (let i = 0; i < pathData.length; i++) {
    if (segmentsPerPath[i] > 0) {
        let segLen = pathData[i].length / segmentsPerPath[i];
        minSegLen = Math.min(minSegLen, segLen);
    }
}

if (minSegLen < 1.0) {
    UDB.showMessage(`Error: Path is too short for the number of source segments.\n\nTotal path length: ${Math.round(totalLength)} units\nSource segments: ${totalSegments}\nMinimum segment length would be: ${minSegLen.toFixed(2)} units\n\nEach segment must be at least 1 unit long.\nEither reduce the number of source segments or use a longer path.`);
    UDB.die();
}

// Create segments on each path
let allNewLinedefs = [];
let sourceIndex = 0;

for (let pathIdx = 0; pathIdx < pathData.length; pathIdx++) {
    let path = pathData[pathIdx];
    let numSegs = segmentsPerPath[pathIdx];
    
    if (numSegs === 0) continue;
    
    let segLen = path.length / numSegs;
    let pathCoords = [];
    
    // Calculate segment boundary positions for this path
    for (let segIdx = 0; segIdx <= numSegs; segIdx++) {
        let targetDist = segIdx * segLen;
        let accDist = 0;
        
        for (let i = 0; i < path.vertices.length - 1; i++) {
            let p1 = path.vertices[i];
            let p2 = path.vertices[i + 1];
            let dx = p2.x - p1.x;
            let dy = p2.y - p1.y;
            let segLength = Math.sqrt(dx * dx + dy * dy);
            
            if (accDist + segLength >= targetDist) {
                let distIntoSeg = targetDist - accDist;
                let ratio = distIntoSeg / segLength;
                
                pathCoords.push([
                    p1.x + dx * ratio,
                    p1.y + dy * ratio
                ]);
                break;
            }
            
            accDist += segLength;
        }
    }
    
    // Draw this path's segments
    UDB.Map.drawLines(pathCoords);
    let newLines = UDB.Map.getMarkedLinedefs();
    
    // Collect the new linedefs
    for (let ld of newLines) {
        allNewLinedefs.push(ld);
        ld.marked = false; // Clear mark for next path
    }
}

// Delete old path linedefs
for (let group of pathGroups) {
    for (let ld of group) {
        ld.delete();
    }
}

// Apply properties to all new linedefs
for (let i = 0; i < Math.min(allNewLinedefs.length, sourceLinedefs.length); i++) {
    let src = sourceLinedefs[i];
    let tgt = allNewLinedefs[i];
    
    if (isInternalPath) {
        tgt.action = 0;
        tgt.tag = 0;
        tgt.args = [0, 0, 0, 0, 0];
        
        for (let flag in tgt.flags) {
            tgt.flags[flag] = false;
        }
        
        tgt.flags["4"] = true;   // Double sided
        tgt.flags["128"] = true; // Not shown on automap
        
        if (tgt.front) {
            tgt.front.textureLow = "-";
            tgt.front.textureMid = "-";
            tgt.front.textureHigh = "-";
            tgt.front.offsetX = 0;
            tgt.front.offsetY = 0;
        }
        
        if (tgt.back) {
            tgt.back.textureLow = "-";
            tgt.back.textureMid = "-";
            tgt.back.textureHigh = "-";
            tgt.back.offsetX = 0;
            tgt.back.offsetY = 0;
        }
    } else {
        tgt.action = src.action;
        tgt.tag = src.tag;
        if (src.args) tgt.args = [...src.args];
        
        for (let flag in src.flags) {
            tgt.flags[flag] = src.flags[flag];
        }
        
        if (src.front && tgt.front) {
            tgt.front.offsetX = src.front.offsetX;
            tgt.front.offsetY = src.front.offsetY;
            tgt.front.textureLow = src.front.textureLow;
            tgt.front.textureMid = src.front.textureMid;
            tgt.front.textureHigh = src.front.textureHigh;
        }
        
        if (src.back && tgt.back) {
            tgt.back.offsetX = src.back.offsetX;
            tgt.back.offsetY = src.back.offsetY;
            tgt.back.textureLow = src.back.textureLow;
            tgt.back.textureMid = src.back.textureMid;
            tgt.back.textureHigh = src.back.textureHigh;
        }
    }
}

// Delete source if requested
if (shouldDeleteSource) {
    for (let ld of sourceLinedefs) {
        ld.delete();
    }
}

// Select all new linedefs
UDB.Map.clearAllSelected();
for (let ld of allNewLinedefs) {
    ld.selected = true;
}

UDB.showMessage(`Conformed ${sourceLinedefs.length} source linedefs to ${pathGroups.length} path(s) (tag ${targetPathTag})\n${allNewLinedefs.length} segments created`);