# ball-force-optimizer
## 🧠 High-Level Overview
This code implements a physics-based genetic optimization algorithm in the browser using JavaScript and HTML canvas.<br/>
It attempts to evolve a force graph that, when applied to a 2D particle (the "ball"), causes it to pass near a series of target points.
## ⚙️ Core Components
### 1. Simulation Space
A ball with position, velocity, acceleration, and mass is simulated using Euler integration.

At each time step (tick), forces are applied along the X and Y axes according to pre-generated force graphs.

The simulation runs for a fixed number of ticks (based on a user-defined time and tick length).

### 2. Target Points
You can define target points manually (manualPoints) or dynamically using a custom formula (pointFormula).

These serve as checkpoints or waypoints the ball should ideally pass near.

### 3. Fitness Function
After simulating a ball’s trajectory using a specific force graph, the fitness is calculated by summing the minimum squared Euclidean distances between each target point and the closest point on the ball's path.

## 🧬 Genetic Optimization
### Key Parameters:
`inGEN`: number of generations

`inMUT`: mutations per generation

`inSTR`: mutation strength

`inMUTC`: mutation chance per tick

`inWRK`: number of Web Workers for parallelization

### Process:
Start with an initial random force graph (forceGraphs).

Run optimizeGraph, which:

> Spawns inMUT mutations of the current best graph.

> Simulates each using a worker pool (parallelized via Web Workers).

> Selects the best graph based on fitness.

> Mutates it again, iterating over inGEN generations.

