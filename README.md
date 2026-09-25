# Clay Cup Arcade

A mobile-friendly, single-player fighting game with eight animated fighters, a SCULPT-inspired stage, secret bosses, unlockable hosts and an original chiptune soundtrack.

[Play the live game](https://clay-cup-arcade-jb.clay-inc-9631.chatgpt.site/)

## Run locally

Requires Python 3. No installation or build step:

```sh
python3 -m http.server 5173 --bind 127.0.0.1 --directory dist
```

Open [localhost:5173](http://localhost:5173). Use an HTTP server; opening `index.html` directly cannot load the sprite metadata reliably.

Sound is **on by default** and begins on the first click, tap or keypress. The sound button mutes music and effects. Music plays during fighter selection and battles; leaving the game or pausing stops it.

## Controls

| Action | Keyboard |
| --- | --- |
| Move | A / D or left / right arrows |
| Jump | W or up arrow |
| Block | Hold S or down arrow |
| Punch / kick / special | J / K / L |
| Pause / resume | Escape or P |
| Confirm | Enter |

Phones get two-thumb touch controls. Hold movement or attacks to repeat them. Specials cost 40 energy. Win two rounds to take a regular match.

## Project layout

```text
dist/                 Editable app source and deployable site
  index.html          Screens, controls and accessible labels
  style.css           Desktop and mobile layouts
  game.js             Combat, opponents, progression and input
  chiptune.js         Web Audio music and sound effects
  assets/             Sprite sheets, atlas, stage, cup and font
scripts/check.mjs     Dependency-free source and asset checks
docs/GAMEPLAY.md       Detailed game, sprite and audio notes
ART-PROMPTS.md        Artwork generation prompts
```

`dist/` is the source of this build-free app. Edit it directly and refresh the browser. There are no external runtime services, API keys or package dependencies. Generated sprite frames use `assets/atlas.json`; they are not evenly spaced tiles.

Host unlocks are stored only in the current browser under `clay-cup-hosts-v1`. Tournament progress resets on reload. The game has CPU opponents, not online multiplayer.

## Check the repository

With Node.js 20 or newer:

```sh
node scripts/check.mjs
```

This checks JavaScript syntax, linked local resources, sprite-sheet dimensions, atlas frame bounds and seeds. The detailed gameplay notes describe earlier manual and engine verification; this script is a source/assets check, not a full browser test suite.

## Deploy

Publish the contents of `dist/` to any static web host. No build command or server-side configuration is required. The app uses relative paths, so it can also run beneath a subdirectory.

## Clone and share

This repository is public and ready to clone:

```sh
git clone https://github.com/jakeblock-ux/clay-cup-arcade.git
cd clay-cup-arcade
```

The original hosting configuration, credentials and deployment history are excluded. All files needed to run the game are included.

## Artwork and font

All required artwork is included. `ART-PROMPTS.md` records the generated assets; supplied portrait references are also required by the game. The bundled Press Start 2P font retains its license in `dist/assets/FONT-LICENSE.txt`. No additional open-source license has been assigned to the game code or artwork.
