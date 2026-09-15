# Assets

**Art direction:** Premium technical-sports interface with a deep navy blueprint texture, teal felt, warm walnut/brass hardware, and cyan HUD lines. The target composition is an elevated three-quarter game-engine view with a centered foosball table, a compact scoreboard, and a left-side Model Lab panel.

| Asset | Source | WebDev path | Use |
|---|---|---|---|
| Visual target | Manus built-in image generation | `/manus-storage/foosball-reference_7b0e437a.png` | QA reference and art-direction anchor |
| Arena background | Manus built-in image generation | `/manus-storage/foosball-arena-bg_7bc87a88.png` | CSS texture behind the canvas |
| Supplied scene | User-provided Drive archive | `/manus-storage/Foosball_Table_web_1480062b.gltf` | Fidelity reference loaded in the Babylon scene |
| Binary geometry | User-provided Drive archive | `/manus-storage/Foosball_Table_1f0a94a5.bin` | glTF buffer |
| Table textures | User-provided Drive archive | `/manus-storage/table_diffuse_color.tga_d562deac.png`, `/manus-storage/table_roughness.tga_594a4be4.png`, `/manus-storage/table_normal.tga_11e0b664.png` | Supplied scene materials |
| Player / ball / handle textures | User-provided Drive archive | `/manus-storage/Player_normal.tga_50fb1db4.png`, `/manus-storage/Ball_diffuse_color.tga_fa2f37c8.png`, `/manus-storage/Handle_diffuse_color.tga_c6510d81.png` | Supplied scene materials |

The interactive replacement models are intentionally procedural Babylon meshes rather than new GLBs: this keeps the swap instant and demonstrates the requested model replacement without requiring a separate 3D-generation pipeline.
