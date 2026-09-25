# Clay Cup Arcade

A complete browser fighting game inspired by the supplied fighter-selection artwork and SCULPT conference stage.

The game opens straight onto fighter selection, with Sabrina selected. Choose Leszek, Sabrina, Avik or Ben, then enter a three-match tournament against the other fighters. Each match is best of three rounds. Includes versus, round intro, knockout, match result, rematch, tournament championship, secret-boss entrance, mid-fight tag, host-unlock celebration, pause and controls screens.

## Run locally

From this folder:

```sh
python3 -m http.server 5173 --directory dist
```

Open http://localhost:5173. A local HTTP server is needed to load the sprite metadata. There are no build steps, runtime dependencies, accounts, or external API calls. The font and artwork are bundled locally.

## Controls

- A / D or left / right arrows: move
- W or up arrow: jump
- S or down arrow: hold to block
- J: punch
- K: kick
- L: special projectile, consumes 40 energy
- P / Escape: pause or resume
- Enter: confirm selection / advance a result

## Mobile play

Phone-sized portrait layouts have a sticky fight button and two-thumb controls beneath a camera that follows both fighters. Landscape phones place movement and attacks beside the arena so everything stays on screen. Touch controls also appear on larger touch-capable devices.

Hold movement or an attack to repeat it. Slide your left thumb between directional buttons; hold movement with one thumb while attacking with the other. Release block before attacking. The special button shows when at least 40 energy is available.

Pause and results use full-screen, scrollable panels on phones. Buttons respect notches and home-indicator safe areas. Rotating the device or losing window focus clears held controls and pauses the match. Sound is on by default. Music begins with the first tap, click or keypress, as browsers require a user gesture to unlock audio. Mute it using the sound button in the top bar.

The renderer adapts to the arena's dimensions, avoids repainting an unchanged selection preview, and stops battle redraws while paused or viewing results. Mobile layouts were checked at 320×568, 390×844, 844×390 and 932×430 CSS-pixel viewports, with additional simulated tests for simultaneous input, pointer cancellation, keyboard/touch ownership, block release, held attacks and tournament progression.

## Artwork

`dist/assets/` contains eight transparent RGBA sheets, each 1254 × 1254 pixels, with 12 poses per fighter. The sheets retain the original generated artwork. They are arranged in three rows but are **not evenly spaced grids**: use `atlas.json`, which supplies frame rectangles, pivots and alpha-component seeds.

Pose order: idle A, idle B, walk A, walk B, punch, kick, special, block, hit, jump, knockout, victory.

The game caches each pose onto an offscreen canvas. Some rectangles overlap, so the loader isolates each silhouette by four-neighbor flood fill from its metadata seed, keeping alpha above 24. Use the same scale (`desired standing height / standingHeight`) across a fighter's poses and draw relative to the supplied pivot. This avoids adjacent sprites and preserves the original source sheets.

- `stage.png`: 1672 × 941 SCULPT-inspired arena.
- `effects.png`: 1254 × 1254 transparent sheet with four impact bursts and four electric effects.
- `selection-reference.png`: supplied reference, used for character portraits.
- `arcade.ttf`: Press Start 2P, bundled with its Open Font License.
- `ART-PROMPTS.md`: exact built-in image generation prompts.

## Game implementation

Plain HTML, CSS and Canvas JavaScript. AI opponents, distinct power/speed/range profiles, hit stun, blocking, jumps, special energy, projectiles, combo feedback, hit effects, round timer and tournament progression are included. Single-player against CPU; this is an arcade prototype, not networked multiplayer. Tournament progress lasts for the current page session. Host unlocks are saved locally in the current browser/device; blocked browser storage falls back to a session-only unlock.

The page feature-detects WebMCP to expose read status, choose fighter and start tournament actions. These use the same game state as the visible controls.

## Secret final and unlocks

After every original competitor is defeated, the game automatically displays **!!!Aproaching!!!!** and starts the secret final. Kareem floats cross-legged with a shared 200-point boss health bar. At 100 health, Varun takes over at twice the standard fighter height; the player keeps their remaining health and time. The camera makes room for his larger silhouette below the HUD. The encounter is one 99-second round. A timeout counts as a boss defense, and a rematch resets both boss phases.

Both bosses use telegraphed push and pull attacks. Jump to evade the force, or face the boss and block to reduce the damage and displacement. Force movement stops at arena boundaries and pulls stop before fighters cross.

Defeat Varun to trigger confetti and unlock **Owen** and **Munnawar**. Both hosts have a microphone-hook special: a visible cabled mic projectile damages and pulls an unguarded target into melee range, then retracts. Blocked mic hits deal reduced damage without pulling. Playing as a host requires beating all four original competitors before the secret final.

The celebration respects reduced-motion preferences with stationary confetti, and the boss entrance uses one soft flash rather than repeated strobing. Added screens were checked in 320×568, 390×844 and 844×390 phone layouts and desktop pause layering. Engine checks cover tournament progression, one-time half-health transition, boss retry, force/block/jump behavior, persistent unlock, both microphone specials, and existing simultaneous touch input.

Additional artwork: `kareem-sheet.png`, `varun-sheet.png`, `owen-sheet.png`, `munnawar-sheet.png`, and the transparent `microphone.png` projectile. All sheets contain 12 poses; Kareem's silhouette remains seated throughout and receives a separate floating offset in the renderer.

## Chiptune audio

Sound is enabled by default for an original eight-bar battle song in C minor at 144 BPM, with square-wave melody, triangle bass and 8-bit noise drums. The song plays on Choose Your Fighter and during active combat, under distinct synthesized effects for attacks, blocks, jumps, projectiles, microphone hooks, boss push/pull, the secret entrance, phase swap, knockouts and unlock celebrations. Pause, backgrounding and mute stop scheduled audio immediately. Returning to fighter selection or refocusing that screen resumes the music when sound is enabled. All music and effects are synthesized locally with Web Audio; no ElevenLabs/Higgsfield audio, external audio files or API credentials are used.

## Leszek artwork correction

Leszek wears no glasses. `leszek-sheet-v2.png` replaces his original 12-pose sheet, and `leszek-portrait.png` is used on fighter select and versus screens. His portrait retains the Polish flag from the supplied reference. The atlas contains the revised source rectangles, pivots and alpha-component seeds; his moves and stats are unchanged.

## Compact controls and cup separators

The controls menu shows six keyboard actions or a short two-thumb guide on mobile, with pause and special-energy hints. Purple cups matching the supplied reference replace text separator dots across selection, match labels, host cards and boss cues.
