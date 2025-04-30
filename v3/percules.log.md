# Percules Learning Log

## 2025-05-01
- Switched to **physical units**: volume → m³, molecule counts based on STP, initial KE = P·V.
- Implemented **discrete bubble events** transferring a fixed 5 mL of air per pop.
- Added a tiny continuous **leak flow** (0.1 mL/tick) for background percolator hum.
- Migrated audio to **AudioWorklet**; injected both pressure‐driven hiss and bubble impulses.
- Built a **filter chain** (bandpass@400 Hz, lowpass@2 kHz, highpass@80 Hz) to shape raw static.
- Tests for all core modules (`vessel`, `connection`, `bubble`, `engine`, `signal`) are passing.

## 2025-05-02
- Added ambient “outside” vessel + vent to avoid pressure runaway.
- Implemented pink-noise turbulence for warmer background hiss.
- Convolution with synthetic IR gave a true glass-like wash.
- Observed that manual tuning of leak/vent rates controls “chug” timing and decay.


### Remaining Challenges
- Audio still too **harsh/digital**, lacking the round “blub-blub” character.
- Turbulence gain and distribution need **tuning** for realistic bubbling.
- Chamber resonance requires **true impulse responses** (glass, water) via convolution.
