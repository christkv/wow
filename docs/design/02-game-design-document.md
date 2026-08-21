# Game Design Document

## Project Worbound

**Document version:** 0.1  
**Design phase:** Pre-production  
**Genre:** Fixed-screen maze shooter  
**Players:** One player with AI companion, or two simultaneous local players  
**Run shape:** Score attack; short-to-medium survival sessions; endless after authored milestones  
**Primary reference:** *Wizard of Wor* arcade

## 1. High concept

Two armed delvers are trapped in a cosmic jailer’s shifting dungeon. They clear a succession of compact mazes by destroying creatures that become faster, smarter, and harder to see as they are killed. A radar reveals what the dungeon hides. Side gates wrap across the room but seal after use. After every clear, a valuable winged creature races for freedom; capture it and the next dungeon scores double. Sometimes the dungeon’s disembodied host enters personally, teleporting around the room and attacking the survivors.

The game is cooperative by necessity and competitive by temptation.

## 2. Design goals

1. **Instant literacy:** A new player should understand move, aim, shoot, and “clear the room” within ten seconds.
2. **Tactical commitment:** A shot should be a spatial decision, not a stream of damage.
3. **Fair uncertainty:** Threats may be hidden on the playfield but never absent from all information channels.
4. **Social stories:** A two-player run should naturally create saves, arguments, revenge, sacrifice, and laughter.
5. **Escalation without bulk:** Difficulty comes from behavior, information, and geometry—not inflated health bars.
6. **Arcade cadence:** Death is fast, restart is fast, scoring is legible, and every dungeon has a dramatic ending.
7. **Original identity:** Preserve mechanics and emotional rhythm while using new names, art, writing, music, and voice.

## 3. Non-goals for this phase

- No campaign cinematics or lore-heavy dialogue trees.
- No loot, character builds, crafting, inventory, or permanent power progression.
- No scrolling world, procedural labyrinth, or exploration backtracking.
- No bullet-sponge bosses.
- No decision yet on engine, rendering stack, netcode, persistence backend, or platform SDKs.
- Online multiplayer is a later product decision; it must not distort the local shared-screen rules now.

## 4. Audience and experience targets

### Primary audience

- Players who enjoy classic arcade score attack and quick restarts.
- Two people sharing one screen, including mixed-skill pairs.
- Retro players who recognize the source and new players who do not.

### Session targets

| Context | Target experience |
|---|---|
| First attempt | 2–5 minutes; reaches or understands the invisible-threat phase |
| Learning session | 10–20 minutes; sees the Arena and recognizes the Worluk wager |
| Skilled run | 20+ minutes; reaches the Pit, chases score routes, and negotiates friendly fire |
| Pass-the-controller play | Instant restart and concise score recap |

## 5. The experience contract

The player must always be able to answer:

- Where am I and which way am I facing?
- Is my shot still live?
- What can reach me through this corridor?
- Where are the threats I cannot see?
- Are the side gates available?
- Is my partner helping, exposed, or aiming through me?
- Is the next objective “clear,” “catch,” or “survive the host”?
- Is double score active now, or being earned for the next dungeon?

If an effect, animation, or interface treatment obscures one of these answers, clarity wins.

## 6. Design pillars

### Pillar 1 — Every shot is a commitment

Each delver may have only one live projectile. The next shot becomes available when the projectile hits a wall, a creature, a player, or another valid projectile. Short corridors offer rapid recovery. Long sightlines offer reach at the cost of temporary helplessness.

### Pillar 2 — Look away to see danger

Advanced hunters cloak in the maze but remain represented on the radar. The player must split attention without pausing the action. The radar is not a minimap: it gives position and movement, not a perfect wall overlay or firing solution.

### Pillar 3 — Cooperation under crossfire

Two delvers occupy the dungeon at once in every standard mode. They can cover lanes, bait threats, and rescue one another. In Classic rules, their shots can also kill each other. Friendly fire must feel foreseeable, immediate, and darkly funny rather than random.

### Pillar 4 — Every clear becomes a chase

After regular enemies are gone, a fast escape target appears. Catching it makes the next dungeon score double. The player must switch from cautious clearing to aggressive interception without a loading break.

### Pillar 5 — The dungeon has a voice

The host reacts to starts, mistakes, milestones, cowardice, friendly fire, missed escape targets, and victories. Its brief callouts make the run feel observed. The voice never masks a critical sound cue.

## 7. Core loops

### 7.1 Moment-to-moment loop

```text
Read corridor and radar
        ↓
Choose facing and position
        ↓
Commit one shot
        ↓
Confirm hit / wait for wall impact / evade
        ↓
Respond to the more dangerous replacement
```

Target decision cadence is roughly one meaningful read-and-act choice every 1–3 seconds, accelerating in open late dungeons.

### 7.2 Dungeon loop

1. Preview the maze from the protected entry alcove.
2. Enter voluntarily or be forced in after a visible countdown.
3. Destroy the visible first-tier population.
4. Manage the cloaking second- and third-tier replacements.
5. Clear the last regular threat.
6. Intercept the escape creature before it reaches an available side gate.
7. If triggered, survive and strike the teleporting host.
8. Resolve score, multiplier state, title/milestone, and next maze.

### 7.3 Run loop

```text
Start with a small reserve squad
        ↓
Descend through increasingly open dungeons
        ↓
Earn and cash future-dungeon double score
        ↓
Gain limited milestone lives
        ↓
Survive Arena → become a veteran → reach the Pit
        ↓
Continue endless score attack until both squads are exhausted
```

## 8. Player rules

### 8.1 Delvers

“Delver” is a placeholder for the player-character role.

- Two color-coded squads: gold on the lower-right, cyan on the lower-left.
- Each active body occupies one corridor cell footprint and faces one cardinal direction.
- Contact with a hostile creature, a hostile projectile, the host’s bolt, or enabled friendly fire destroys one life.
- Death is a short, non-gory burst; it must not hide nearby projectiles for the survivor.
- A reserve body appears in the protected alcove immediately when available.
- The player may choose the re-entry moment during a short countdown; timeout forces entry.

### 8.2 Movement and facing

- Four-way movement only.
- The character continues only while directional input is held.
- A brief directional tap while stopped changes facing without appreciable displacement.
- Reversals are immediate; diagonal movement and diagonal fire do not exist.
- Corners should feel crisp, not magnetized or slippery.

The original cabinet achieved pivoting with a two-stage joystick. Modern control validation should compare:

1. **Tap-to-pivot:** short taps rotate; sustained input moves.
2. **Aim modifier:** holding a face/aim input permits stationary rotation.

Tap-to-pivot is the default design intent because it preserves the one-stick/one-button vocabulary. The modifier is an accessibility alternative if tests show frequent accidental movement.

### 8.3 Weapon

- Fires in the current facing direction.
- One live player projectile per delver.
- Unlimited ammunition; no reload or pickup economy.
- Projectile terminates on wall, valid target, or valid projectile collision.
- No piercing and no splash damage in the base rules.
- A clear muzzle/weapon-ready cue shows whether another shot is available.

### 8.4 Side gates

- One gate centered on each lateral edge; entering one exits the other.
- Players and creatures use the same gates.
- Traversal closes the route temporarily, preventing immediate reuse.
- Gate state is visible on both the maze and radar frame.
- Starting a new major phase reopens both gates unless tuning proves that this trivializes the escape chase.

The gates serve three roles: panic escape, cross-map interception, and temporary denial.

### 8.5 Lives and re-entry

Proposed default:

- Three total lives per human squad at run start, including the first active body.
- Solo AI companion has its own reserve tuned to preserve social geometry without carrying the player indefinitely.
- One bonus life after surviving the first Arena milestone.
- One bonus life after clearing dungeon 12, immediately before the first Pit.
- Maximum reserve cap to be tuned; initial test cap: six.

The original cabinet supported configurable life packages. This proposal removes coin-economy variants and makes milestone survival the readable source of extra lives.

## 9. Combat and collision contract

Priority when events occur in the same update window:

1. Gate traversal already begun resolves before new contact checks.
2. Projectile-versus-projectile collision cancels both if the advanced rule is enabled.
3. Projectile-versus-character resolves before character contact.
4. Character-versus-character hostile contact destroys the delver.
5. Score and replacement spawn resolve after the death visual begins.

The exact ordering is a design contract because perceived unfairness often comes from ambiguous simultaneous events. A later prototype must expose these cases in slow motion.

## 10. Enemy ecology

Names below are original placeholders; the parenthetical term identifies the reference role.

| Role | Placeholder | Readability | Behavior promise | Score baseline |
|---|---|---|---|---:|
| Tier 1 (Burwor analogue) | Prowler | Electric blue, squat, always visible | Wanders, then pressures; slowest and least evasive | 100 |
| Tier 2 (Garwor analogue) | Veilmaw | Amber, tall snout/horns, cloaking ripple | More directed pursuit; cloaks outside reveal conditions | 200 |
| Tier 3 (Thorwor analogue) | Ravager | Scarlet, wide claws, hot afterimage | Fast, evasive, aggressive; uses cloak more confidently | 500 |
| Escape target (Worluk analogue) | Riftwing | Cyan-magenta wings, unique strobe trail | Spawns after clear; races for an available side gate | 1,000 + next-dungeon 2× |
| Host (Wizard analogue) | The Gaoler | Violet-blue spectral silhouette | Teleports, fires a bolt, relocates, and closes distance | 2,500 + proposed next-dungeon 2× |

### 10.1 Shared enemy rules

- A dungeon supports at most six regular threat slots at once.
- All regular enemies can kill by contact.
- Prowlers, Veilmaws, Ravagers, and the Gaoler can fire; Riftwing relies on speed/contact.
- Enemies obey walls and cardinal lanes except the Gaoler during teleport.
- Threats may use side gates.
- Enemy silhouettes remain distinct without color.
- No regular enemy requires multiple hits.

### 10.2 Succession model

Every Prowler is associated with a potential Veilmaw, and every Veilmaw with a potential Ravager. Dungeon progression controls how much of each chain is active:

| Dungeon band | Initial composition | Replacement depth | Design lesson |
|---|---|---|---|
| 1 | Six Prowlers | Introduce one late Veilmaw and Ravager chain | Killing can escalate danger |
| 2–3 | Mostly Prowlers | Two to three full chains | Radar and chase tutorial |
| 4 / Arena | Mixed | Several full chains | Open-space crossfire |
| 5–7 | Mixed | Up to six chains | Mastery consolidation |
| 8–12 | Veilmaws/Ravagers arrive earlier | Full depth | Maximum standard behavior pressure |
| 13 / Pit | Open arena | Full depth | Pure movement, aim, radar, and teamwork exam |
| 14+ | Weighted repeats and variants | Full depth | Endless score mastery |

This table is a proposed curve, not a claim of exact original scheduling.

### 10.3 Cloaking contract

- Cloaked enemies are absent or nearly absent from the maze body but always visible as shaped radar blips.
- A subtle local distortion may mark their cell for accessibility, but cannot become a free outline in Classic rules.
- A cloaked enemy reveals when sharing an unobstructed cardinal corridor with a delver, when firing, when hit, and briefly after gate traversal.
- Reveal and recloak use distinctive audio cues.
- Color-independent radar shapes distinguish Veilmaw and Ravager.

### 10.4 Enemy intent states

Regular enemies draw from five readable states:

1. **Roam:** choose a corridor path without direct commitment.
2. **Hunt:** bias toward a delver’s region.
3. **Align:** seek a firing corridor.
4. **Evade:** step out of a visible projectile lane.
5. **Swarm:** coordinate pressure from multiple directions in later dungeons.

The player need not see state labels, but behaviors must be stable enough to learn. “Smarter” cannot mean arbitrary input reading.

### 10.5 Riftwing phase

- Begins immediately after the final regular kill with a unique spawn pulse at or near center.
- Objective banner and voice cue switch from CLEAR to CATCH.
- Riftwing chooses a side gate and can revise its path if that gate closes.
- It may kill by contact but does not fire.
- If caught, next dungeon displays a persistent 2× promise.
- If it escapes, the incomplete musical cadence and closed gate visually communicate the miss.

### 10.6 Gaoler phase

- The Gaoler may invade after the Riftwing resolves, with probability increasing by dungeon band and recent performance.
- A warning flash and spatial sound precede the first appearance.
- Each cycle: choose a valid location → telegraph → materialize → fire once → remain vulnerable briefly → vanish.
- Success requires one clean hit, not damage attrition.
- The phase ends when a delver dies or the Gaoler is hit.
- Teleports bias progressively closer but cannot materialize directly on a delver without a fair warning window.

## 11. Scoring and multiplier economy

### 11.1 Baseline table

Use the classic point ratios initially:

| Event | Points | Notes |
|---|---:|---|
| Prowler | 100 | Foundation target |
| Veilmaw | 200 | Cloaking premium |
| Ravager | 500 | High-risk target |
| Friendly-fire kill in Classic | 1,000 | Deliberately tempting and socially explosive |
| Riftwing capture | 1,000 | Also arms next-dungeon double score |
| Gaoler strike | 2,500 | Also proposed to arm double score if not already armed |

### 11.2 Double score rules

- `NEXT DUNGEON ×2` is a promise state earned by capturing Riftwing or striking the Gaoler.
- The promise activates at the next dungeon’s entrance.
- It multiplies target points, not milestone-life grants.
- It lasts for exactly one dungeon, including that dungeon’s Riftwing and Gaoler phases.
- Multiple qualifying events before activation do not stack above ×2 in the base mode.
- HUD language must distinguish **armed next** from **active now**.

### 11.3 Shared and individual scoring

- Each player owns an individual score.
- Enemy points go to the player whose shot resolved the kill.
- Dungeon completion and multiplier state are shared run state.
- Solo mode displays the human score prominently and AI contribution as a smaller support score.
- Two-player recap shows kills by tier, rescues, friendly-fire incidents, Riftwing captures, and deepest dungeon.

## 12. Game modes

### 12.1 Solo + AI companion — default solo

The human controls gold; the AI controls cyan.

AI companion principles:

- It is helpful but not optimal.
- It prefers a different lane/region from the human.
- It covers exposed approaches and fires only at confirmed targets.
- It does not deliberately target the human.
- Its shots remain physically dangerous if the human crosses them.
- It reacts to visible information and radar under the same broad rules as the player; it does not reveal hidden state through cheating behavior.
- It occasionally creates recoverable mistakes so that the player still authors the run.

### 12.2 Two-player Classic — reference rules

- Simultaneous shared screen.
- Friendly fire on.
- Friendly-fire kills score 1,000 for the shooter.
- Both players share dungeon progression and multiplier state, but keep individual scores and reserves.
- If one squad is exhausted, the survivor may continue the shared run.

### 12.3 Two-player Alliance — approachable co-op

- Friendly fire off; shots pass through or cancel safely according to playtest readability.
- Shared score is optional presentation, not a different content set.
- Separate leaderboard/category from Classic.
- Recommended for first-time mixed-skill pairs.

### 12.4 Practice — validation/support mode

- Select a discovered dungeon archetype.
- Infinite reserves and score submission disabled.
- Optional radar training, cloak slow-down, and shot-ready visualization.
- Intended for accessibility and learning, not progression grind.

## 13. Dungeon design

### 13.1 Layout principles

Every authored maze must contain:

- at least one short defensive wall for rapid shot recovery;
- at least two meaningful loops so pursuit is not deterministic;
- a contested central or near-central junction;
- viable paths between both entry alcoves and both side gates;
- no spawn-to-player firing lane without adequate warning;
- radar-legible movement patterns;
- at least one cooperative back-to-back position and one dangerous crossfire lane.

### 13.2 Layout archetypes

| Archetype | Geometry | Skill stressed |
|---|---|---|
| Lattice | Dense short corridors and many corners | Pivot precision, rapid shot reuse |
| Rings | Nested loops with few radial links | Prediction and gate interception |
| Crossroads | Long cardinal axes and short side pockets | Shot commitment and crossfire discipline |
| Split Keep | Two halves joined by narrow bridges | Partner coordination and rescue |
| Arena | Broad center with partial outer cover | Exposure management |
| Pit | No meaningful interior cover | Pure movement, aim, and threat reading |

### 13.3 Selection

- Use a curated pool, not unconstrained procedural generation.
- Avoid repeating the same layout within the previous three standard dungeons.
- Weight openness upward with dungeon depth.
- Place the Arena at dungeon 4 for the first major exam.
- Place the Pit at dungeon 13 and every six dungeons thereafter for the endurance exam.
- Allow late-game mirrored/rotated layout variants only when entry and gate fairness remains intact.

### 13.4 Content target for first playable design set

- 10 standard authored layouts across four archetypes.
- 1 Arena layout.
- 1 Pit layout.
- 5 enemy roles.
- 13-dungeon tuned progression to the first Pit.
- Endless weighted continuation after dungeon 13.

This is a design-validation target, not an implementation estimate.

## 14. Difficulty model

Difficulty rises across independent axes:

- enemy movement speed;
- projectile speed/frequency;
- direct pursuit bias;
- willingness to evade incoming fire;
- time spent cloaked;
- number of full succession chains;
- initial proportion of advanced threats;
- maze openness;
- gate-use confidence;
- Gaoler appearance rate and vulnerable dwell time.

Rules:

- Never raise all axes at the same dungeon boundary.
- Preserve one readable learning theme per early dungeon.
- Enemy health remains one hit.
- Maximum speed should be reached before the first Pit; later difficulty comes from composition and geometry.
- Pair difficulty adjustments affect enemy behavior, not hidden rubber-banding of score.

### Proposed first-13-dungeon teaching curve

| Dungeon | New pressure | Milestone |
|---:|---|---|
| 1 | Visible Prowlers, one succession reveal | Learn move, pivot, one-shot limit |
| 2 | First full cloak/radar hunt; first Riftwing | Learn radar and future multiplier |
| 3 | More chains; gate use | Learn cross-map interception |
| 4 | Arena geometry | Bonus life after survival |
| 5 | First likely Gaoler invasion | Learn teleport duel |
| 6–7 | Faster mixed threats, wider lanes | Consolidate mastery |
| 8 | Veteran/Warlord-style title | Behavior reaches standard maximum |
| 9–11 | Swarm coordination and evasive enemies | Score routing under pressure |
| 12 | Pre-Pit warning and final bonus life | Prepare psychologically |
| 13 | Pit: no meaningful cover | First major endurance climax |

## 15. HUD and information design

### 15.1 Layout

- Maze consumes the majority of the horizontal screen.
- Scores sit at upper corners or flanking lower panels, always associated with player color and icon.
- Radar occupies the lower center.
- Reserve alcoves occupy lower left/right edges of the maze.
- Dungeon number/name and objective state sit immediately above the radar.
- Multiplier state is adjacent to the objective, not buried in score decoration.

### 15.2 State vocabulary

| State | Maze cue | Radar/HUD cue | Audio cue |
|---|---|---|---|
| Shot ready | Weapon core lit | Small ready pip | Subtle charge click |
| Shot live | Visible projectile | Ready pip empty | Shot tone sustains faintly |
| Cloak | Enemy dissolves | Shaped blip stays solid | Descending veil tone |
| Gate open | Bright inner aperture | Side tick lit | Low portal hum |
| Gate sealed | Dark barrier | Side tick crossed | Short seal thud |
| Riftwing phase | Center spawn flare | Objective: CATCH | Unique fast arpeggio |
| Next ×2 armed | No intrusive maze effect | `NEXT ×2` badge | Rising two-note promise |
| ×2 active | Thin gold maze-edge pulse | `×2 NOW` badge | Completed cadence |
| Gaoler imminent | Violet edge distortion | Warning sigil | Spatial crack + voice ducking |

### 15.3 Radar contract

- Radar shows all hostile beings, including cloaked threats and phase targets.
- The human’s own position is omitted or minimally anchored to encourage relative reading; teammate representation remains distinct.
- Radar does not show maze walls in Classic rules.
- Blip shape and motion trail communicate enemy tier without relying on hue.
- Radar never flashes so strongly that it becomes a second action screen.

## 16. Onboarding

There is no separate mandatory tutorial. Dungeon 1 teaches through controlled sequencing:

1. The entry alcove frames the character and shows a directional prompt.
2. First Prowler approaches along a short corridor; the player learns facing and fire.
3. A long empty corridor creates a safe opportunity to feel the one-shot lockout.
4. The first transformation is staged away from immediate contact.
5. The radar pulses only when the first cloaking enemy appears.
6. Dungeon 2 introduces Riftwing and explicitly shows `NEXT ×2` after a capture.

Prompts disappear after successful action and never pause co-op play. Returning players can disable all prompts.

## 17. Narrative and tone

### 17.1 Premise

Two rival rescue squads entered a living prison to break its cosmic warden. The prison loops space, breeds new guardians from defeated ones, and feeds on rivalry. The warden cannot resist narrating its own game.

### 17.2 Tone

- Pulpy science-fantasy rather than solemn dark fantasy.
- Menacing host, but playful enough to laugh at a friendly-fire disaster.
- Story is implied through names, milestone titles, visual transformations, and callouts.
- No cutscene interrupts the score-run rhythm.

### 17.3 Voice system

The Gaoler has original, context-sensitive callout categories:

- attract/start invitation;
- first cloak warning;
- dangerous missed shot;
- Riftwing appears/captured/escaped;
- friendly-fire delight;
- Arena and Pit announcements;
- Gaoler entrance, hit, and kill;
- new personal best and game over.

Example original tonal lines for testing only:

- “That shot has a long way to regret itself.”
- “Watch the pulse below, little trespasser.”
- “Two enter together. How long will that last?”
- “No walls now. No excuses.”

No original *Wizard of Wor* speech line or recording should be reused.

## 18. Visual direction

### 18.1 Style target

“Recovered arcade hardware from a science-fantasy future”: crisp, deliberately limited sprites and maze geometry, enhanced by modern glow, distortion, and readable anticipation frames. The visual system should evoke the economy of early raster games without copying the original sprite designs.

### 18.2 Palette logic

- Black field: space, absence, and maximum silhouette contrast.
- Electric cyan/blue: dungeon architecture and system state.
- Gold: player one and reward state.
- Cyan: player two/companion.
- Blue → amber → scarlet: escalating enemy tiers.
- Magenta/violet: Riftwing and Gaoler supernatural phases.
- White: impacts and critical warnings, used briefly.

Color always has a shape/animation partner for accessibility.

### 18.3 Animation priorities

1. Facing direction.
2. Shot-ready state.
3. Enemy reveal/cloak transition.
4. Gate availability.
5. Replacement birth.
6. Riftwing chosen route.
7. Gaoler teleport telegraph.
8. Death source and ownership.

### 18.4 Effects limits

- Explosions clear within the time needed for the next tactical read.
- Screen shake is minimal by default and removable.
- No full-screen bloom during live danger.
- Flash frequency and contrast must have reduced-flash alternatives.
- Pixel-perfect collision is not implied by decorative glow; the solid sprite core communicates the hit area.

## 19. Audio direction

### 19.1 Audio pillars

- **Positional utility:** shots, reveals, gate use, and teleport arrivals are locatable.
- **Machine character:** short synthetic tones suggest arcade circuitry without imitating a specific sound chip recording.
- **Contextual antagonist:** speech is rare enough to remain special and ducks around critical cues.
- **Musical punctuation:** dungeon start, Riftwing success/failure, multiplier activation, Arena, Pit, and game over each have a compact original motif.

### 19.2 Priority stack

1. Incoming lethal projectile/contact warning.
2. Cloak reveal and Gaoler teleport.
3. Gate state.
4. Player shot and hit confirmation.
5. Riftwing objective.
6. Voice.
7. Ambient bed.

The original game’s recognizable musical quotation should not be replicated. Compose a new cadence with distinct interval and rhythm.

## 20. Accessibility and comfort

- Full input remapping for keyboard and controllers.
- Tap-to-pivot sensitivity setting and alternate aim modifier.
- Colorblind-safe silhouettes, radar shapes, and patterns.
- High-contrast radar mode and scalable radar/HUD.
- Subtitles with speaker icon and concise non-verbal event captions.
- Reduced flash, glow, shake, and distortion presets.
- Separate volume controls for effects, voice, music, and ambience.
- Friendly-fire toggle through Alliance mode, with distinct leaderboard rules.
- Optional cloak distortion and longer reveal window in assist modes.
- Adjustable forced-entry countdown.
- Pause in solo; shared confirmation pause in local co-op.
- No required rapid button mashing or hold duration beyond ordinary movement.

## 21. Attract, menus, and run flow

```text
Attract vignette / demo
        ↓ any input
Mode card: Solo + AI / Two-player Classic / Alliance / Practice
        ↓
One-screen control reminder
        ↓
Dungeon 1 entry alcove
        ↓
Continuous run with sub-second dungeon transitions
        ↓ both squads exhausted
Score recap + personal best + quick restart
        ↓ idle
Return to attract mode
```

Menu time from launch to control should be under three selections for the default mode. The game never requires lore selection before play.

## 22. Fail states and fairness

Every death recap should identify the cause for roughly one second without stopping the survivor:

- creature contact;
- hostile projectile;
- partner shot;
- Gaoler bolt;
- forced re-entry exposure.

Fairness rules:

- No hostile spawn on top of an active delver.
- No Gaoler materialization kill without telegraph.
- Cloaked enemies remain on radar at all times.
- Forced entry never chooses a direction that walks the player into danger automatically.
- Friendly-fire projectile uses the shooter’s color trail.
- Explosion effects never conceal an already-lethal projectile.

## 23. Playtest plan and success criteria

### 23.1 Prototype questions

1. Does one-live-shot firing create satisfying tension or only frustration?
2. Can players understand and use radar without a wall overlay?
3. Does tap-to-pivot feel deliberate on controller and keyboard?
4. Does the AI companion feel like a partner rather than a kill-stealing bot?
5. Is Classic friendly fire funny and legible before it becomes hostile?
6. Does the Riftwing phase produce a meaningful pace change?
7. Are Arena and Pit difficulty spikes earned and survivable?
8. Can players distinguish `NEXT ×2` from `×2 NOW`?

### 23.2 Observable success criteria

| Criterion | Target |
|---|---|
| New player fires and intentionally pivots | Within 30 seconds |
| New player checks radar without a prompt | By end of dungeon 2 |
| Player can explain why a long missed shot was dangerous | After one occurrence |
| First Riftwing objective understood | Within its first appearance or immediate recap |
| Accidental friendly-fire death correctly attributed | At least 90% of observed cases |
| Co-op pair verbally divides lanes or calls a threat | By dungeon 3 in most sessions |
| Deaths judged readable/fair | At least 80% in early qualitative tests |
| Arena changes player positioning | Clearly observable in most runs |
| Players request an immediate retry | Stronger signal than raw session length |

### 23.3 Test cohorts

- 6–8 players familiar with the arcade original.
- 6–8 arcade-action players unfamiliar with it.
- 6 mixed-skill local pairs.
- 3–4 players using accessibility options relevant to vision, motor input, or sensory comfort.

## 24. Design risks and mitigations

| Risk | Consequence | Mitigation |
|---|---|---|
| Pivot input feels unresponsive | Core motion is rejected | Test tap threshold and alternate aim modifier immediately |
| Radar demands excessive eye travel on modern screens | Cloaked deaths feel cheap | Keep maze/radar vertically compact; offer scale/position presets |
| AI companion is too accurate | Human feels secondary | Limit knowledge, reaction, and target ownership; reward covering behavior |
| AI companion is too reckless | Solo feels random | Preserve lanes, avoid firing through human, communicate target lock |
| Friendly fire causes grief | New pairs quit | Default recommendation can be Alliance for first-time co-op; keep Classic explicit |
| Modern effects obscure lanes | Readability collapses | Enforce effect budget and solid-core silhouettes |
| Endless mode feels content-thin | Mastery becomes repetition | Authored layout variety, milestone titles, voice reactivity, score goals |
| Reference fidelity creates IP exposure | Shipping risk | Clean-room assets/writing/music, placeholder names, legal review |
| Added systems dilute the original | Loses identity | Enforce non-goals and the five pillars at review gates |

## 25. Definition of the first design-complete slice

The design is validated—not merely documented—when a playable test can demonstrate:

- one dense maze and one open Arena-style maze;
- two simultaneous delvers, with solo AI takeover;
- pivoting and one-live-shot combat;
- Prowler → Veilmaw → Ravager succession;
- cloak plus radar counterplay;
- side gates with lockout;
- Classic and Alliance friendly-fire rules;
- Riftwing chase and next-dungeon ×2;
- one Gaoler teleport encounter;
- protected re-entry with countdown;
- readable score, reserves, objective, and multiplier states;
- the onboarding beats in Storyboard SB-01.

No additional content system should be designed until this slice proves the experience contract.
