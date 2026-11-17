# Fabric 3D

**A 3D Jacquard Fabric Simulator**  
Author: **H4D1AM**  
Version: **0.1.0**  
Platform: Windows 10/11

## Version 0.1.0

This is the first desktop foundation milestone. It provides:
- English dark desktop UI.
- BMP import and map inspection.
- Red = warp, white = weft convention.
- Independent warp/weft system counts and total densities.
- Repeat input such as `1.2.1.3`, validated against the relevant system count.
- Repeat controls disabled when that family has one system.
- Per-system yarn type, count, unit (Nm, Den, Tex, Ne), color picker, and optional manual diameter.
- Save/open project settings as JSON.

### Pixel scaling rule

- Horizontal scale = total weft density / number of weft systems.
- Vertical scale = total warp density / number of warp systems.

These are relative cell scaling values for the map display and must be calibrated against the actual loom/map convention before being treated as physical dimensions.

## Run

1. Install Python 3.11 or newer.
2. Double-click `run_windows.bat`.
3. Import a red-and-white BMP.

## Build EXE

After running the app once and installing dependencies, run `build_windows.bat`. The executable is generated under `dist`.

## Important status

This version is a functional UI/configuration prototype, **not yet the 3D yarn renderer**. JPEG export currently saves a high-quality diagnostic image of the imported map. It does not claim to render chenille pile, super-yarn sheen, metallic reflections, or true yarn interlacing yet. Those are the next development milestone.

## Yarn model roadmap

Automatic yarn diameter will use the selected count system as an initial estimate, with manual diameter override. Exact physical diameter cannot be derived from yarn count alone; fiber type, twist, construction, and packing density also affect it. The color picker is independent for every warp and weft system.
