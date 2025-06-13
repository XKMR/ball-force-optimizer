# ball-force-optimizer
## 🧠 High-Level Overview
This code implements a physics-based genetic optimization algorithm in the browser using JavaScript and HTML canvas.<br/>
It attempts to evolve a force graph that, when applied to a 2D particle (the "ball"), causes it to pass near a series of target points.
## ⚙️ Core Components
### 1. Simulation Space
A ball with position, velocity, acceleration, and mass is simulated using Euler integration.

At each time step (tick), forces are applied along the X and Y axes according to pre-generated force graphs.

The simulation runs for a fixed number of ticks (based on a user-defined time and tick length).
