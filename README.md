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
> `inGEN`: number of generations
>
> `inMUT`: mutations per generation
>
> `inSTR`: mutation strength
>
> `inMUTC`: mutation chance per tick
>
> `inWRK`: number of Web Workers for parallelization

### Process:
1. Start with an initial random force graph (forceGraphs).

2. Run optimizeGraph, which:
> Spawns `inMUT` mutations of the current best graph.
> 
> Simulates each using a worker pool (parallelized via Web Workers).
> 
> Selects the best graph based on fitness.
> 
> Mutates it again, iterating over inGEN generations.

### Mutation:
Each tick of each axis' force graph has a `inMUTC` chance of being altered by ±`inSTR`.

This introduces small, controlled randomness, allowing exploration of the search space.

### “Stuck” Mode:
If performance plateaus for 5 generations, mutation strength is scaled to escape local minima.

## 🔄 Simulation Loop
### Each tick:

Forces from the optimized graph are applied.

Physics is integrated over time (Δt = 1/64).

The ball’s position is updated.

Its new position is rendered to the canvas (updateCanvas()).

### The simulation can be run:

In batch mode (headless for speed).

In real-time, animating the best evolved graph's effect on the ball.

## 🧰 Parallelization with Web Workers
The optimization offloads simulation work to inWRK parallel threads (Web Workers).

Each worker receives a subset of mutated graphs to simulate.

Results are merged to find the best performing candidate.

The main thread stays responsive for UI rendering.

## 🎨 Rendering
Uses HTML canvas to draw:

White dots for target points.

A yellow ellipse representing the ball’s position.

Coordinate transforms are applied to scale/center the view using `updateMargin()`.

## 🧪 Advanced Features & Customizability
Points can be generated algorithmically (`usePointFormula = true`), enabling dynamic scenarios.

Modular worker code is generated as a `Blob`, allowing easy in-browser parallelism without external scripts.

Adjustable canvas resolution, point sizes, and simulation parameters through the DOM.
