# Turbo Ascend – Game Plan

## 1. The idea
You fly a futuristic electric sports car through the sky and escape enemies that fly with air boosters. On each level you collect materials and use them to upgrade the car, so it gets stronger and changes its look. You go from a beat-up dirt car to a godlike cosmic machine, and each level is harder than the last.

- **Platform:** website, played mostly on a computer
- **Genre:** 3D flying escape game with an upgrade system

## 2. Art style: stylized realism
- **Somewhere between a cartoon and real life.** Think Rocket League or Fortnite: proper shapes, lighting, reflections and shadows, but with smooth surfaces, bright colours and slightly exaggerated proportions.
- **The car:** a sleek, low electric roadster with chunky wheels that fold sideways into hover-thrusters when it flies. It's an original design with no Tesla logo, which keeps it safe to put online.
- **Effects:** glowing boosters, motion trails, clouds you can fly through, sparks when you get hit, and the sky slowly changing colour as you go.

## 3. Camera
- **Fixed position:** behind and slightly above the car, always at the same angle. It never rotates or shakes.
- The car moves around inside the screen while the world scrolls toward you, like in Subway Surfers or Star Fox.
- The boost still feels fast because of the speed lines and the booster flames.

## 4. Controls (computer)
| Key | Action |
|---|---|
| W or ↑ | Fly up |
| S or ↓ | Fly down |
| A or ← | Move left |
| D or → | Move right |
| Space | Turbo boost (uses fuel) |
| Shift | Special ability |
| E | Garage (between levels) |
| Esc | Pause |

The car always flies forward on its own, so you only steer. No mouse needed.

## 5. Levels

### Main path
| # | Level | Material | Car look | Enemies | New ability |
|---|---|---|---|---|---|
| 1 | Dirt | Mud chunks | Rusty, muddy, dented | Small robot drones | Basic boost |
| 2 | Grass | Vine bundles | Green wrap with moss detail | Drones + police hover-bikes | Bigger fuel tank |
| 3 | Stone | Granite plates | Rugged stone armour plates | Police jets with sirens | Takes 2 hits |
| 4 | Iron | Iron ore | Brushed steel, rivets | Alien scout UFOs | Shield bubble |
| 5 | Gold | Gold nuggets | Polished gold, shiny reflections | Robots, police and aliens together | Material magnet |
| 6 | Diamond | Raw diamonds | See-through crystal panels | Alien warships + robot snipers | Invincible dash |
| 7 | Angel | Halo feathers | White and gold, feathered wings, halo | Demons with fire wings (boss: Demon King) | Light blast |

### After Angel
| # | Level | Material | Car look | Enemies | New ability |
|---|---|---|---|---|---|
| 8 | Galaxy | Star shards | Deep purple with moving stars | Space pirates, asteroid storms | Warp jump |
| 9 | Black Hole | Dark matter | Black with a glowing ring | Void creatures that pull you in | Gravity pull |
| 10 | Neon Cyber | Data cores | Neon lines, holograms | Glitch robots that teleport | Hack (freezes enemies) |
| 11 | Time Warp | Time crystals | Flickers between old looks | Enemies from every level | Slow time |
| 12 | Dragon Realm | Dragon scales | Scales and dragon wings | Fire-breathing dragons | Fire breath |
| 13 | Rainbow Prism | Prism gems | Colours shift through the rainbow | Light spirits that copy you | Rainbow shield |
| 14 | Cosmic God | Cosmic cores | Glowing like a small star | Universe Eater (final boss) | All abilities powered up |

## 6. How a level plays
1. Fly through the level and collect the material, while enemies chase you.
2. Use boost to escape and abilities to fight back.
3. Once you have enough material, a portal opens and you face a boss.
4. Beat the boss, go to the garage, upgrade, then move to the next level.

**What gets harder each level:** faster enemies, more of them, smarter attacks, riskier spots for materials, and obstacles like lightning, meteors and lava.

## 7. Extras
- **Coins** for paint colours, boost trails and horns
- **Leaderboard** with the best time for each level
- **Auto-save** progress in the browser
- **Sound:** music for each level and engine sounds that build as you boost

## 8. How it gets built
- **Tech:** Three.js, which does 3D in the browser. It runs on any computer with no download.
- **3D models:** built with simple shapes and smooth materials in code, or made in Blender (a free 3D modelling program) for more detail.

### Build stages
| Stage | What gets made |
|---|---|
| 1. Prototype | The car flies, the fixed camera follows, one enemy chases you |
| 2. Level 1 complete | Materials, health, boost, a boss, the garage |
| 3. Levels 1–7 | Every tier, the car looks and the abilities |
| 4. Polish | Effects, sound, menus, saving |
| 5. Levels 8–14 | The cosmic levels and the final boss |
| 6. Launch | Put it on a website |
