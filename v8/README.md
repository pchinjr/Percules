# Bong Simulator v8 - Physically Accurate Audio Synthesis

A scientifically accurate bong simulator that models fluid dynamics, bubble acoustics, and Helmholtz resonance to generate realistic audio in real-time.

## Physics Model

The simulator implements several interconnected physical models:

### 1. Shallow Water Equations
- **Method**: 1D Lax-Friedrichs finite difference scheme
- **Equations**:
  - Mass conservation: ∂h/∂t + ∂(hu)/∂x = 0
  - Momentum conservation: ∂u/∂t + u·∂u/∂x + g·∂h/∂x = 0
- Models water height and velocity along the tube

### 2. Bubble Dynamics
- **Buoyancy**: F = (ρ_water - ρ_air) × V × g
- **Drag**: Stokes drag for small Reynolds numbers (F = 6πμrv)
- **Generation**: Probabilistic bubble creation based on flow rate
- **Size distribution**: Larger flow rates produce larger bubbles

### 3. Acoustic Modeling

#### Minnaert Frequency (Bubble Resonance)
- Each bubble oscillates at its natural frequency
- Formula: f ≈ 3.26/r (Hz, where r is radius in meters)
- Example: 1mm bubble resonates at ~3.26 kHz
- Example: 5mm bubble resonates at ~652 Hz

#### Helmholtz Resonance (Chamber)
- The air chamber acts as a resonant cavity
- Formula: f = (v/2π)√(A/(V×L))
  - v = speed of sound in air (343 m/s)
  - A = cross-sectional area of neck
  - V = chamber volume
  - L = neck length (water depth)
- Typical frequency: 50-200 Hz depending on geometry

#### Turbulence Noise
- Pink noise modulated by local flow velocity
- Contributes to the "gurgling" sound character

## Installation & Usage

### Prerequisites
- Deno 2.4 or higher

### Running the Simulator

```bash
# Start the development server
deno task dev

# Or run directly
deno run --allow-net --allow-read src/server.ts
```

Then open http://localhost:8000/index.html in your browser.

### Controls

- **Suction Pressure**: Simulates inhaling (0-500 Pa)
- **Water Depth**: Height of water in chamber (5-20 cm)
- **Chamber Volume**: Volume of air chamber (0.5-3 L)
- **Tube Diameter**: Inner diameter of tube (3-10 cm)

## Visualizations

### Water Height Profile
Shows the water surface along the tube length with active bubbles rendered as circles.

### Audio Waveform
Real-time time-domain display of the audio signal.

### Frequency Spectrum
FFT analysis showing the frequency components of the sound, including:
- Low frequencies from Helmholtz resonance
- Mid-high frequencies from bubble oscillations
- Broadband turbulence noise

## Parameters

### Default Physical Constants

```typescript
// Geometry
tubeLength: 0.30 m        // 30 cm tube
tubeDiameter: 0.05 m      // 5 cm diameter
waterDepth: 0.10 m        // 10 cm water
chamberVolume: 0.001 m³   // 1 liter

// Water properties (20°C)
density: 998 kg/m³
viscosity: 0.001 Pa·s
surface tension: 0.0728 N/m
sound speed: 1482 m/s

// Air properties
density: 1.2 kg/m³
sound speed: 343 m/s
```

## Technical Implementation

### Architecture

```
src/
├── physics.ts   - Core physics engine (shallow water, bubbles, acoustics)
├── audio.ts     - Web Audio API integration
├── main.ts      - Application logic and visualization
└── server.ts    - HTTP server
```

### Audio Synthesis
- Sample rate: 44.1 kHz
- Physics timestep: 0.1 ms (adaptive)
- Audio generated via Web Audio API ScriptProcessorNode
- Real-time synthesis from physics simulation state

### Performance
- ~200 spatial cells for shallow water discretization
- Multiple physics steps per audio sample for stability
- Efficient TypedArray usage for numerical arrays
- RequestAnimationFrame for smooth visualization

## Scientific Accuracy

The simulation is based on established physics:

1. **Shallow Water Equations**: Standard hyperbolic PDE system used in hydraulics
2. **Minnaert Frequency**: Published in 1933, well-validated for bubble acoustics
3. **Helmholtz Resonance**: Classical resonator theory from 1850s
4. **Stokes Drag**: Valid for small bubbles (Re < 1)

## Limitations

- 1D model (assumes cylindrical symmetry)
- No water splashing or spray
- Simplified turbulence model
- No temperature effects
- Assumes incompressible flow

## Future Enhancements

- 2D/3D fluid simulation
- More sophisticated turbulence modeling (LES/DNS)
- Nonlinear bubble dynamics
- Ice/percolator modeling
- Different chamber geometries
- Recording and playback functionality

## References

1. Minnaert, M. (1933). "On musical air-bubbles and the sounds of running water"
2. Leighton, T. G. (1994). "The Acoustic Bubble"
3. Prosperetti, A. (1977). "Thermal effects and damping mechanisms in the forced radial oscillations of gas bubbles in liquids"
4. Toro, E. F. (2009). "Riemann Solvers and Numerical Methods for Fluid Dynamics"

## License

MIT - For educational and entertainment purposes
