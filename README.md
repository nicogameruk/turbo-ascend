# Turbo Ascend

A 3D flying-car escape game that runs in the browser. Fly through 14 levels, collect materials, beat each boss, and upgrade your car from a dented dirt racer into a glowing cosmic machine.

**▶ Play it: https://nicogameruk.github.io/turbo-ascend/**

Built with [three.js](https://threejs.org) and [Vite](https://vite.dev). All models, textures, sound and music are generated in code, so there are no asset files.

## Controls

| Key | Action |
|---|---|
| W A S D / Arrows | Steer |
| Space | Turbo boost (uses fuel) |
| B | Use your ability |
| M | Horn |
| E | Garage (after a level) |
| Esc | Pause |

You pick which ability to take into each round in the garage: **Shop → Ability**. Level rewards are free there, and extra abilities (Nitro, Repair Kit, Double Up, Homing Missiles) can be bought with coins.

**Phones and tablets:** turn on **Settings → Controls → Touch screen**. Drag on the left side of the screen to steer, and use the BOOST, ABILITY, horn and pause buttons on the right.

## Run it on your computer

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

## Build the website version

```bash
npm run build
```

This makes a `dist` folder with everything the game needs. It uses relative paths, so the folder works from any web address. To check the built version locally:

```bash
npm run preview
```

## Put it online

Pick one:

- **GitHub Pages (automatic):** push this project to a GitHub repository, then in the repository go to **Settings → Pages** and set **Source** to **GitHub Actions**. Every push to `main` (or `master`) then builds and publishes the game using `.github/workflows/deploy.yml`. The game appears at `https://<your-username>.github.io/<repository-name>/`.
- **Netlify Drop:** run `npm run build`, then drag the `dist` folder onto https://app.netlify.com/drop.
- **itch.io:** run `npm run build`, zip the *contents* of `dist` (so `index.html` is at the top of the zip), create a new HTML game on itch.io and upload the zip, ticking "This file will be played in the browser".

## Saving

Progress, coins, looks, records and settings save automatically in the browser (localStorage). They stay on that browser and device only. **Settings → Delete saved progress** wipes them.

## Project layout

| File | What it does |
|---|---|
| `src/main.js` | Game loop, states (title, flying, boss, garage…), abilities |
| `src/levels.js` | All 14 levels: looks, enemies, hazards, boss, music |
| `src/car.js` | The car, its upgrades and its look for each level |
| `src/enemies.js` | Regular enemies and the spawner |
| `src/boss.js` | The bosses and their attacks |
| `src/hazards.js` | Meteors, lightning, lava walls, asteroids |
| `src/world.js` | Sky, ground, scenery, stars and landmarks |
| `src/audio.js` | Sound effects and music (Web Audio) |
| `src/garage.js`, `src/menu.js`, `src/hud.js` | Garage, menus and on-screen display |
| `src/progress.js`, `src/save.js`, `src/cosmetics.js` | Upgrades, saving, shop items |
| `docs/turbo-ascend-plan.md` | The original game plan |
