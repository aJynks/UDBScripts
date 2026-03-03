# Monster Closet Scripts for Ultimate Doom Builder

Three UDBScript tools for creating efficient, teleporter-based monster closets in MBF21 format Doom maps.

# Credits

Chess-Closest idea taken from DragonFly's Monster Closet Tutorial.
https://www.youtube.com/watch?v=mZTfm0sewaY (9:51 - Monster Spawning Closets)

DragonFly Credits : an_Mutt for teaching him the method.


## Overview

These scripts automate the creation of "monster closets" - hidden sectors that store monsters ready to teleport into your map. The classic checkerboard pattern allows monsters to activate when the player makes noise, then teleport in via linedef action 97.

## Scripts

### 1. Monster Closet Creator (`MonsterCloset_Chess.js`)

Creates an optimized checkerboard-style monster closet at your cursor position.

#### Script Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| Monster EdNum | Thing Type | 3005 | The monster type to place (uses thing picker) |
| Thing Width | Integer | 62 | Width of the monster |
| Thing Height | Integer | 56 | Height of the monster |
| Number of Monsters | Integer | 8 | How many monsters to place in the closet |
| Monster Sector Floor Height | Integer | 0 | Floor height for monster sectors |
| Teleport Tag | Integer | 0 | Tag for teleport destination (0 = auto-assign next unused) |


#### Usage

1. Bind Script to a hotkey Slot, with a bound Hotkey 
2. Position your cursor where you want the closet to spawn. Ensure there is room!
3. Configure the script options in the UDB Scripts docker
4. The closet is created from the top left courner, at your cursor position (snapped to grid)

**Note**: The closet is created but not yet functional. You still need to:
- Create a teleport destination sector with the matching tag
- Place a teleport destination thing (type 14) in that sector
- Connect the closet to a noise-triggering sector in your map
- Add a trigger to lower the space sector floors (activating the teleports)

---

### 2. Monster Closet - Create Bounds (`MonsterCloset_Chess-SoundBox.js`)

Creates a bounding sector around selected monster closets and sets external lines of each closet to be impassable. For use as a sound activation sector.

#### Script Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| Buffer size | Integer | 64 | Space between closet edge and bounding box |


#### Usage

1. Create one or more monster closets using the first script
2. Arrange your closest neatly together, with some space between each closet. 32 or 64 units is nice standard distance.
3. Select all the closet sectors via Sector Mode (Sector Mode must be the active selection set when running the script)
4. Run this script (I recommend via a hotkey, like before)
5. A bounding box is created with properly flagged external lines

---

### 3. Monster Closet - Chess - Tags (`MonsterCloset_Tags.js`)

Manages teleport tags for selected linedefs with walk-over teleport actions. Provides 4 different modes for various tagging workflows.

#### Script Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| Mode | Enum | Mode 1 | Select which tagging mode to use |
| 1 : Assign TAG | Integer | 0 | (Mode 1) Tag to assign (0 = auto-assign first unused) |
| 2 : Assign TAG Range | String | "" | (Mode 2) Random tag range (e.g., "6-9" or "200-240") |
| 3 : Tag by Group | Integer | 0 | (Mode 3) Starting tag for groups (0 = auto-assign) |
| 4 : Line2Line Teleport Type | Enum | 244 | (Mode 4) Which line2line teleport action to use |

#### Modes

**Mode 1 - Assign TAG:**
- Sets all selected teleport linedefs to the same tag
- If you enter 0, auto-finds the first unused tag
- Perfect for setting a single closet to one destination

**Mode 2 - Assign TAG Range:**
- Randomly assigns tags from a specified range (e.g., "6-9")
- Each linedef gets a random tag within that range
- Useful for spreading monsters across multiple destinations

**Mode 3 - Tag by Group:**
- Automatically finds groups of physically connected teleport linedefs
- Each group gets its own unique incrementing tag
- Excellent for managing multiple monster closets - each closet automatically gets its own tag

**Mode 4 - Line2Line Teleport Setup:**
- Converts selected teleport lines to line-to-line teleports (actions 243, 244, 262-267)
- Assigns unique tags to each source linedef
- Creates a destination line at cursor with matching segments
- Each destination segment gets a randomly shuffled matching tag
- Creates complete line2line teleport systems in one step

#### Usage

1. Select geometry containing teleport linedefs (works with linedef, vertex, or sector selection)
2. Choose your desired mode from the dropdown
3. Configure the relevant options for that mode
4. Run the script
5. The script filters to only affect walk-over teleport actions (97, 39, 125, 126, 207, 208, 243, 244, 262-269)


## License & Credits

Chess-Closet idea taken from DragonFly's Monster Closet Tutorial:
https://www.youtube.com/watch?v=mZTfm0sewaY (9:51 - Monster Spawning Closets)

DragonFly Credits: an_Mutt for teaching him the method.

MIT Lisence.