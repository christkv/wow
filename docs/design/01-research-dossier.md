# Research Dossier: *Wizard of Wor*

## 1. Purpose and scope

This dossier answers one question: **what must a modern clone preserve for players to recognize the original game’s character even if every asset, line, and name is new?**

The reference target is the arcade release, not any one home conversion. Sources disagree on whether to label it 1980 or 1981. The title screen and some databases use a 1980 copyright date; the International Arcade Museum and Arcade Flyer Archive date the commercial machine and flyer to 1981. For design purposes this package calls it the “1980-copyright / 1981 arcade release.”

Research was desk-based. No original ROM, cabinet, or frame-by-frame capture was used in this pass. Exact timings, movement speeds, collision tolerances, and maze-selection probabilities remain measurement tasks.

## 2. Source hierarchy

| Tier | Sources | Best use | Caution |
|---|---|---|---|
| A — period artifact | [1981 Bally Midway sales flyer](https://flyers.arcade-museum.com/videogames/show/1308) | Original positioning, terminology, cabinet-era fantasy | Marketing copy is not a full rules reference |
| B — museum/database | [International Arcade Museum](https://www.arcade-museum.com/Videogame/wizard-of-wor), [Arcade History](https://www.arcade-history.com/?id=3179&n=wizard-of-wor-model-961&page=detail), [ArcadeItalia/MAME entry](https://adb.arcadeitalia.net/dettaglio_mame.php?game_name=wow) | Cabinet controls, display, stage loop, enemy succession, one-player AI companion | Community-maintained; some facts can be version-specific |
| C — contemporary port manual | [Atari 2600 game manual transcription](https://www.atariage.com/2600/manuals_old/wizard_of_wor.html) | Clear statement of intent, enemy roles, radar, doors, one-shot constraint, scoring | Home-port details can differ from the arcade board |
| D — retrospective reference | [MobyGames overview](https://www.mobygames.com/game/10745/wizard-of-wor/), [StrategyWiki](https://strategywiki.org/wiki/Wizard_of_Wor), [GameFAQs arcade guide](https://gamefaqs.gamespot.com/arcade/583844-wizard-of-wor/faqs/28341) | Strategy, special dungeons, emergent dynamics | Treat precise timing and level numbers as hypotheses until captured |

## 3. Evidence-backed feature inventory

Confidence refers to the arcade target, not to whether a feature is desirable in the new game.

| Finding | Evidence | Confidence | Clone implication |
|---|---|---:|---|
| Fixed-screen maze shooter for one or two simultaneous players | Museum, flyer, multiple databases | High | Keep the entire tactical state on one shared screen |
| Four cardinal movement directions and one fire button | Museum cabinet specifications | High | Preserve a tiny input vocabulary |
| Original dual-contact joystick allowed facing without movement | Museum gameplay notes | High | Preserve deliberate pivoting, adapted to modern input |
| Only one projectile per player can exist at once | Port manual and arcade strategy sources | High | A missed long shot must leave the shooter briefly exposed |
| Side doors wrap a being to the opposite side and then close temporarily | Museum/database and port manual | High | Doors are limited tactical resources, not passive tunnels |
| Radar shows threats that can be invisible in the maze | Manual and databases | High | The player must continually alternate focal attention |
| Six blue Burwors begin a dungeon | Manual and databases | High | Six concurrent threat slots define the classic encounter budget |
| Kills escalate blue Burwor → yellow Garwor → red Thorwor | Arcade History and Games Database | High | Enemy succession creates a readable three-act encounter inside each dungeon |
| Yellow and red enemies can cloak, but remain on radar | Multiple database/manual sources | High | Information is obscured, never wholly withheld |
| From dungeon 2, the Worluk appears after regular enemies are cleared | Multiple sources | High | Every stage after the first gets a short pursuit epilogue |
| Killing the Worluk doubles values in the next dungeon | Manual, museum, databases | High | Reward applies to future risk, encouraging continued play |
| The Wizard may appear after the Worluk phase, teleports, and fires | Museum, Arcade History, manual | High | A stage can end with an unpredictable duel rather than a quiet tally |
| Solo play includes a computer-controlled blue companion | ArcadeItalia/MAME, StrategyWiki, arcade guide | Medium-high | The social geometry exists even when only one person is playing |
| Two human players can cooperate, shoot each other, and score for it | Museum, manual, databases | High | Friendly fire is a central source of stories, not an incidental option |
| A replacement player waits in a protected lower alcove and can delay entry | Arcade History-derived databases | High | Re-entry timing is an active decision with a short deadline |
| Dungeons become more open and enemies faster/more aggressive | MobyGames and retrospective sources | Medium-high | Difficulty should rise through geometry and behavior, not health inflation |
| The Arena occurs around dungeon 4 and The Pit around dungeon 13, recurring every six thereafter | GameFAQs/StrategyWiki | Medium | Use as the proposed structure, then verify against captured play |
| Regular maze layouts are selected from a curated pool in varying order | Period flyer language and arcade guide | Medium | Prefer authored layouts with weighted selection over procedural noise |
| Shot interactions can cancel other shots/lightning | Museum and arcade guide | Medium | Potential high-skill rule; prototype and test for readability |
| Arcade display was horizontal, approximately 320×204 at 60 Hz | Arcade History technical entry | High | Preserve the dense horizontal composition, not the literal resolution |
| Votrax speech and antagonist taunts were a prominent attraction | Arcade History and museum technical notes | High | The host’s voice is a gameplay reward and pressure system |

## 4. Anatomy of the original experience

### 4.1 The screen is a tactical instrument

The screen has four simultaneous information zones:

1. the maze, where line-of-fire and movement are resolved;
2. side doors, which promise escape while creating ambush risk;
3. the lower radar, where cloaked hunters remain legible;
4. lower corner reserve boxes, where the next life waits before re-entry.

The player cannot stare at the avatar. Mastery requires a visual rhythm: **maze → radar → corridor alignment → shot → radar**. This divided attention is arguably the game’s strongest unique mechanic.

### 4.2 One shot creates commitment

The weapon has unlimited ammunition but only one live projectile per shooter. A hit or wall impact frees the next shot. This makes corridor length meaningful: firing into a long empty lane is dangerous because the player cannot respond elsewhere until the projectile resolves. Fire rate therefore emerges from spatial judgment rather than a cooldown meter.

### 4.3 Each dungeon contains its own escalation curve

The regular encounter is not a flat extermination wave. It evolves:

```text
visible blue prowlers
        ↓ killed/replaced
cloaking yellow hunters
        ↓ killed/replaced
faster red predators
        ↓ all cleared
escaping bonus creature
        ↓ caught or escaped
possible teleporting host duel
```

The maximum concurrent population remains understandable while the composition gets more dangerous. The player experiences relief at each kill and dread at what the kill releases.

### 4.4 Radar makes invisibility fair

Garwors and Thorwors can disappear from the main playfield but remain detectable below it. The game does not ask the player to guess; it asks the player to interpret approximate position under pressure. They become visible in tactically relevant situations, such as sharing a corridor in the documented port behavior. The result is suspense with counterplay.

### 4.5 The Worluk is a continuation wager

Clearing the regular wave triggers a fast creature that tries to leave through a side door. Killing it gives points and doubles the next dungeon’s values. The reward is neither immediate power nor safety. It makes the *next* dangerous space more valuable, linking adjacent stages into a score-chasing story.

### 4.6 The companion is both protection and hazard

In solo play a computer-controlled companion occupies the blue slot. In two-player play a human takes that role. Either way, a second weapon changes threat routing and creates crossfire. Human friendly fire awards points in the classic rules, so a run can shift between cooperation and rivalry without changing modes. Even a helpful companion can accidentally hit a player who walks into its line.

### 4.7 Maze geometry is the difficulty system

Walls provide cover, shorten projectile travel, shape visibility, and constrain approach directions. More open layouts remove all four benefits at once. The named Pit strips away interior cover entirely; its threat is not a new stat but the loss of spatial control. The Arena foreshadows that pressure with a broad central opening.

### 4.8 The Wizard is the cabinet’s personality

The Wizard speaks during attract mode, stage transitions, enemy escalation, player deaths, and late-game milestones. The voice turns a systems-driven survival loop into an argument with a recurring antagonist. The original’s early speech technology mattered historically, but the deeper design lesson is contextual antagonism: the host notices what the player just did.

## 5. Original scoring baseline

The following values are consistently reported across the manual and arcade databases:

| Target | Original baseline | Additional effect |
|---|---:|---|
| Burwor / blue tier | 100 | Begins visible |
| Garwor / yellow tier | 200 | Cloaking hunter |
| Thorwor / red tier | 500 | Faster, more dangerous hunter |
| Opposing Worrior | 1,000 | Opponent loses a life |
| Worluk | 1,000 | Double values in the next dungeon |
| Wizard of Wor | 2,500 | Some references also associate the kill with next-dungeon double score; verify arcade revision |

The magnitude communicates a clear hierarchy without multipliers becoming difficult to parse. A red predator is worth five blue prowlers; a friendly-fire kill is conspicuously lucrative; the Wizard is the single largest target.

## 6. What makes it enduring

### Preserve exactly in spirit

- **Shared fixed screen:** no scrolling camera and no split screen.
- **Four-way locomotion:** position and facing should be instantly readable.
- **Single live shot:** this is the heart of tactical firing.
- **Radar-dependent cloaking:** invisibility always has a counter-information channel.
- **Enemy succession:** killing an enemy can make the room more dangerous.
- **Side-door wrap with temporary lockout:** escape changes the whole board state.
- **Solo companion and simultaneous human co-op:** two-body geometry is always present.
- **Friendly-fire tension:** default-on in the score-authentic ruleset.
- **Worluk-style chase and future-stage double score:** run-level risk/reward.
- **Contextual antagonist voice:** the game reacts to the run.
- **Authored maze pool plus landmark dungeons:** recognition and surprise coexist.

### Modernize carefully

- Replace the pressure-sensitive cabinet input with an understandable pivot behavior.
- Add remapping, colorblind-safe shapes, subtitles, reduced flash, and readable cloak cues.
- Offer a no-friendly-fire “Alliance” ruleset without erasing the classic mode.
- Improve state feedback at the radar, doors, spawn alcoves, and score multiplier.
- Use high-resolution pixel art or another deliberately constrained look while retaining silhouette clarity.
- Make the first dungeon teach through sequencing, not a separate tutorial level.
- Write and record an original antagonist voice and original musical identity.

### Do not inherit blindly

- Coin-priced life packages and cabinet DIP-switch ambiguity.
- Bugs, pre-freezes, or opaque cabinet-specific exploits.
- Exact sprites, names, cabinet art, voice lines, voice recordings, or five-note musical quotations.
- Unsignaled deaths attributed to visual clutter or indistinguishable colors.
- Endless escalation with no meaningful milestones, recap, or optional stopping point.

## 7. Reference experience statement

> Two armed delvers descend through luminous, single-screen dungeons. Every shot is a commitment, every kill releases a worse threat, and invisible hunters can be tracked only by glancing away from the action. The delvers survive by covering each other—until a crossing shot, a tempting score, or the dungeon’s taunting master turns cooperation into betrayal.

That statement is the bridge from research into the proposed design.

## 8. Research gaps and next tests

| Gap | Why it matters | Recommended method |
|---|---|---|
| Exact player, enemy, and projectile speeds by dungeon | Determines whether the intended tension is replicated | Frame-step representative arcade captures |
| Pivot input tolerance | Defines whether modern controls feel authentic or sticky | Compare cabinet footage, then test two modern mappings |
| Cloak reveal rules and timings | Governs fairness | Capture Garwor/Thorwor visibility state in several corridors |
| Door open/closed timing and per-stage reset behavior | Changes escape tactics | Time repeated player and enemy traversals |
| Enemy replacement schedule by dungeon | Shapes progression | Log first 15 dungeons across several runs |
| Wizard appearance probability and double-score behavior | Affects scoring contract | Verify against at least two arcade ROM revisions/cabinets where lawful |
| Maze pool size and selection rules | Sets content target | Catalog layouts from long-form arcade footage |
| Shot cancellation rules | Could add depth or confusion | Reproduce player/player, player/enemy, and player/Wizard projectile collisions |
| Solo companion behavior | It is a signature feature and a major feel risk | Record target selection, positioning, reaction time, and friendly-fire cases |
| Lives/bonus-life defaults | Cabinet settings vary | Consult operator documentation and cabinet DIP configuration |

