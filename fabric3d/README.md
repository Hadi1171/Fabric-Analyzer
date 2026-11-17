# Fabric 3D
**A 3D Jacquard Fabric Simulator** · **H4D1AM** · Version **0.2.0**

## Windows installer
Download the GitHub Actions artifact named **Fabric-3D-Setup-v0.2.0-Windows**. Run the setup EXE; the Inno Setup wizard lets you change the installation folder and optionally create a desktop shortcut.

## Workflow
Intro → Welcome → New Fabric → six guided steps:
1. Load red/white BMP map (red = warp, white = weft).
2. Warp and weft system counts.
3. Total warp and weft density.
4. Warp and weft repeat rhythms (e.g. 1.2.1.3).
5. Individual warp yarn type, count, unit (Nm / Den / Tex / Ne), color.
6. Individual weft yarn type, count, unit (Nm / Den / Tex / Ne), color.
Then Create Fabric opens a project confirmation and save option.

## Design
Premium dark interface with black surfaces, red actions/highlights, white text, and a custom woven app icon.

## Important
Version 0.2.0 implements the guided configuration workflow and installer. It does **not yet implement true 3D yarn interlacing or physically rendered chenille/super/metallic materials**. The final screen confirms the inputs; it is not a completed 3D render.
