# Memory

The supplied archive is an asset bundle, not an application: one glTF scene, one binary buffer, several PNG-converted TGA textures, three STL files, and two JPEG previews. The web deliverable therefore adds the missing game shell and interaction logic rather than attempting to run an unknown original application.

The glTF scene used relative paths such as `images/table_diffuse_color.tga.png` and `Foosball_Table.bin`. A patched web copy now points at the uploaded WebDev storage paths. The interactive table is procedural and kept visible independently of the imported source model; the source glTF is loaded as a disabled fidelity reference so a slow or unsupported source asset cannot prevent the playable arena from rendering.

The main interaction contract is semantic custom events (`foosball:reset`, `foosball:kick`, `foosball:swap`, `foosball:rod`) so React only owns the frame and HUD while Babylon owns scene state and gameplay.
