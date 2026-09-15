# Leonhart ITSF Simulator — APK import

The supplied Android debug APK is a Capacitor wrapper around a finished browser build, not a native Unity or Flutter binary. Its `assets/public` directory contains the actual Babylon.js/React runtime, the simulator UI, the game logic, and the Leonhart STL/field assets.

The WebDev project now serves that browser build directly from `client/index.html` and `client/public/assets`. The external asset paths in the extracted bundle were rewritten to storage URLs owned by this project. The APK’s original interface and runtime are preserved: shot controls, trajectory analysis, opponent rods, defense variants, moving-opponent controls, calibration, settings, audio toggle, reset, and the Babylon scene.

The previous procedural demo source remains in `client/src` as a rollback/reference implementation, but it is not the active entry point after this import. The active page is the extracted APK web bundle.
