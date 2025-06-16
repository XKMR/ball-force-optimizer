//INPUTS
var inTIME = 1; //seconds
var inGEN = 1000; //number of generations
var inMUT = 100; //mutations per generation
var inSTR = 4; //strength of mutations
var inMUTC = 0.1; //mutation ratio of graphs
var inWRK = 10; //number of workers
var inPTZ = 0.1; //size of points
var usePointFormula = false; //Use Point Formula
var pointFormula = "[i, Math.round(Math.random()*10)]";//point formula
var manualPoints = [[0,0], [2,4], [4,0], [5,5]];//points to use if not use formula
var inCSZ = 400; //canvas size
var inBMS = 1; //ball mass
var inBSP = [0.0, 0.0]; //ball starting position

//technical
var inTL = 1/64; //tick length

var firstRun = true;

function generat_target_points(UsePointFormula, PointFormula, InputPoints){
    let target_points = [];
    if(UsePointFormula){
        
        let pcount = 3
        let i = 0;
        while(i < pcount){
            target_points.push(eval(PointFormula));
            i++;
        }
    }else{
        target_points = InputPoints
    }
    return target_points;
}
var target_points = generat_target_points(usePointFormula, pointFormula, manualPoints);

//Canvas setup
const canvas = document.getElementById("canvas");
canvas.height = canvas.width = inCSZ;
const ctx = canvas.getContext("2d");
var pointSize = inPTZ;

var realTimeMode = false; // false = batch, true = real-time
var tickCount = 0;
var tickLength = inTL;
var bestOptimizedGraph;

function updateMargin(){
    let margin = parseInt(document.getElementById("margin").value)/100;
    let x_transform = canvas.width/(space[1][0]-space[0][0])*margin;
    let y_transform = canvas.height/(space[1][1]-space[0][1])*margin;
    let transform = Math.min(x_transform, y_transform);
    let x_offset = (canvas.width - (canvas.width*margin))/2;
    let y_offset = (canvas.height - (canvas.height*margin))/2;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.beginPath();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.closePath();
    ctx.setTransform(transform, 0, 0, -transform, x_offset, canvas.height-y_offset);
    drawTargetPoints();
}

function drawPoint([x, y], color, size){
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(x, y, size, size, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.closePath();
}

function drawTargetPoints(){
    for(let i = 0; i<target_points.length; i++){
        let [x, y] = target_points[i];
        drawPoint([x, y], "white", pointSize);
        
    }
}

function distance([x1, y1], [x2, y2]) {
    
    let dx = x2-x1, dy = y2-y1;
    return dx*dx + dy*dy;
    //return Math.hypot(x2-x1, y2-y1);
}

function indexOfSmallest(arr) {
  if (arr.length === 0) {
    return -1; // Handle empty array case
  }
  let smallestIndex = 0;
  for (let i = 1; i < arr.length; i++) {
    if (arr[i] < arr[smallestIndex]) {
      smallestIndex = i;
    }
  }
  return smallestIndex;
}

var space = (function(){
    
    let [minX, minY] = target_points[0];
    let [maxX, maxY] = [minX, minY];

    for(const [x, y] of target_points){
        if(x > maxX) maxX = x;
        if(y > maxY) maxY = y;
        if(x < minX) minX = x;
        if(y < minY) minY = y;

    }

    return [[minX, minY], [maxX, maxY]];
})();


updateMargin();
drawTargetPoints();
var started = true;
updateStatusUI(true);
document.getElementById("replayButton").disabled = true;

var ball = {
    position: [...inBSP],
    velocity: [0,0],
    acceleration: [1,0],
    mass: inBMS
}

// --------------- GENERATE FORCE ----------------------
var tickLimit = Math.round((inTIME)/tickLength); //number is in seconds

function generateRandomGraph(length, strength){
    //let value = 0;
    let newValue = 0;
    let graph = [0.0];
    for(let i = 0; i < length; i++){
        //newValue = value+(Math.random()*strength)-0.5;
        graph.push(newValue);
        //value = newValue;
    }
    return graph;
}


//woker
const workerCode = /*js*/`
self.onmessage = function(e) {
    
    var { graphs, tickLimit, tickLength, target_points, starting_position } = e.data;

    function distance([x1, y1], [x2, y2]) {
        let dx = x2 - x1, dy = y2 - y1;
        return dx*dx + dy*dy;
    }

    function simulateGraph(graph) {
        let tickCount = 0;
        let ball = {
            position: [...starting_position],
            velocity: [0.0, 0.0],
            acceleration: [0.0, 0.0],
            mass: 1
        };
        let history = [];

        while (tickCount <= tickLimit) {
            for (let d = 0; d < 2; d++) {
                const force = graph[d][tickCount];
                ball.acceleration[d] = force / ball.mass;
                ball.velocity[d] += ball.acceleration[d] * tickLength;
                ball.position[d] += ball.velocity[d] * tickLength;
            }
            history.push([...ball.position]);
            tickCount++;
        }

        let totalDist = 0;
        for (let target of target_points) {
            const distances = history.map(pos => distance(pos, target));
            totalDist += Math.min(...distances);
        }
        return { totalDist, history };
    }

    const results = {
        totalDistances: [],
        positionHistories: []
    };

    for (const graph of graphs) {
        const result = simulateGraph(graph);
        results.totalDistances.push(result.totalDist);
        results.positionHistories.push(result.history);
    }

    self.postMessage(results);
};
`;

const workerPool = [];
const workerIdle = [];
let workerTaskResolvers = [];

function setupWorkerPool(num) {
    if (workerPool.length > 0) return; // already initialized

    for (let i = 0; i < num; i++) {
        const worker = new Worker(workerURL);
        workerPool.push(worker);
        workerIdle.push(true);

        worker.onmessage = function (e) {
            const resolver = workerTaskResolvers[i];
            if (resolver) resolver(e.data);
            workerTaskResolvers[i] = null;
            workerIdle[i] = true;
        };
    }
}


const workerBlob = new Blob([workerCode], { type: "application/javascript" });
const workerURL = URL.createObjectURL(workerBlob);


// --------------- TEST FORCE GS ----------------------
var aPositionHistory = []
var cPositionHistory = []
const startingMultiplier = 1
var forceGraphs = function(){
    let g = [];
    for(let i = 0; i < 1; i++){
        g.push([generateRandomGraph(tickLimit, startingMultiplier),generateRandomGraph(tickLimit, startingMultiplier)]);
    }
    return g;
}();
//console.log(forceGraphs);
for(let i = 0; i < forceGraphs.length; i++){

    tickCount = 0;
    cPositionHistory = [];

    ball.position = [...inBSP];
    ball.velocity = [0.0, 0.0];
    ball.acceleration = [0.0, 0.0];

    while(tickCount <= tickLimit){
        simulation_tick(i);
    }
    aPositionHistory.push(cPositionHistory);
    //console.log("ITERATION ",(i+1).toString()," COMPELITE");
}


(async () => {
    bestOptimizedGraph = await optimizeGraph(forceGraphs[0], inGEN, inMUT, inSTR, true);
})();


// --------------- NEW GRAPHS! -------------------------

function mutateGraph(graph, strength = 0.2) {
    let mutated = [[], []];
    for (let d = 0; d < 2; d++) {
        for (let t = 0; t < graph[d].length; t++) {
            if (Math.random() < inMUTC) { // mutate only 10% of ticks
                let variation = (Math.random() - 0.5) * strength;
                mutated[d][t] = graph[d][t] + variation;
            } else {
                mutated[d][t] = graph[d][t];
            }
        }
    }
    return mutated;
}

function restart(mode){

    if(mode == 0){
        (async () => {
            bestOptimizedGraph = await optimizeGraph(bestOptimizedGraph, inGEN, inMUT, inSTR, (mode==1)?true:false);
        })();
    }else if(mode == 1){
        (async () => {
            bestOptimizedGraph = await optimizeGraph(forceGraphs[0], inGEN, inMUT, inSTR, (mode==1)?true:false);
        })();
    }
}

async function optimizeGraph(initialGraph, generations = 50, mutationsPerGen = 10, mutationStrength = 0.2, restart = true) {
    updateStatusUI(true);
    firstRun = false;
    let currentBest = initialGraph;
    let lastScore = 0;
    let currentScore;
    let stuckCount = 0;
    let stuck = false;
    for (let gen = 0; gen < generations; gen++) {
        let candidates = [currentBest];
        let strength = mutationStrength;

        if(stuck) strength *= currentScore;

        for (let i = 0; i < mutationsPerGen; i++) {
            candidates.push(mutateGraph(currentBest, strength));
        }

        let results = await simulateGraphSet(candidates);

        const bestIndex = indexOfSmallest(results.totalDistances);
        currentBest = candidates[bestIndex];

        console.log((stuck ? '\x1b[31m' : "") + `Generation ${gen + 1}: Best Score = ${results.totalDistances[bestIndex]}\x1b[0m`);
        currentScore = results.totalDistances[bestIndex];

        if((lastScore - currentScore)<1e-6) stuckCount++;
        if(currentScore != lastScore) stuckCount = 0;
        lastScore = currentScore;
        if(stuckCount >= 5 && !stuck){
            stuck = true;
            //console.log('\x1b[31m'+"stuck mode on");
        }
        if(stuckCount < 5 && stuck){
            stuck = false;
            //console.log('\x1b[32m'+"stuck mode off");
        }

        if(gen%1000 == 0) console.clear();
    }
    document.getElementById("finalScore").innerHTML = currentScore;
    updateStatusUI(false);
    document.getElementById("continueButton").disabled = false;
    document.getElementById("replayButton").disabled = false;
    return currentBest;
}

var optimizedGraphSet = [];

async function simulateGraphSet(graphSet) {
    const numWorkers = inWRK;
    setupWorkerPool(numWorkers);
    let starting_position = inBSP;

    const chunkSize = Math.ceil(graphSet.length / numWorkers);
    const promises = [];

    for (let i = 0; i < numWorkers; i++) {
        const chunk = graphSet.slice(i * chunkSize, (i + 1) * chunkSize);
        if (chunk.length === 0) continue;

        const worker = workerPool[i];
        workerIdle[i] = false;

        const promise = new Promise((resolve) => {
            workerTaskResolvers[i] = resolve;
            worker.postMessage({
                graphs: chunk,
                tickLimit,
                tickLength,
                target_points,
                starting_position
            });
        });

        promises.push(promise);
    }

    const results = await Promise.all(promises);

    // Merge results
    const combined = {
        totalDistances: [],
        positionHistories: []
    };

    for (const res of results) {
        combined.totalDistances.push(...res.totalDistances);
        combined.positionHistories.push(...res.positionHistories);
    }

    optimizedGraphSet = graphSet;
    return combined;
}






// --------------- DISPLAY BEST ------------------------

function runBestGraphRealTime(){
    //destroyWorkerPool();

    realTimeMode = true;
    tickCount = 0;

    // Reset ball state
    ball.position = [...inBSP];
    ball.velocity = [0.0, 0.0];
    ball.acceleration = [0.0, 0.0];
    cPositionHistory = [];
    document.getElementById("replayButton").innerText = "❚❚ Replay Best";
    document.getElementById("replayButton").classList.add("playing");
    startRealTimeLoop();

}

function startRealTimeLoop(){
    started = true;
    
    const loop = setInterval(() => {
        if (!started || tickCount > tickLimit) {
            clearInterval(loop);
            realTimeMode = false;
            document.getElementById("replayButton").innerHTML = "▶ Replay Best";
            document.getElementById("replayButton").classList.remove("playing");
            return;
        }
        simulation_tick_graph(bestOptimizedGraph, draw = true) // draw = true
        
    }, tickLength * 1000); // convert to ms
}


// --------------- MAIN FUNCTION -----------------------
var localTime = 0;
function simulation_tick(iteration, shouldDraw = true){
    let d = 0;
    let force = [0, 0];
    while(d < 2){
        force[d] = forceGraphs[iteration][d][tickCount];
        ball.acceleration[d] = force[d] / ball.mass;
        ball.velocity[d] += ball.acceleration[d] * tickLength;
        ball.position[d] += ball.velocity[d] * tickLength;
        d++;
    }
    cPositionHistory.push([...ball.position]);
    if (shouldDraw) updateCanvas();
    tickCount++;
}
function simulation_tick_graph(graph, draw = false) {
    let d = 0;
    let force = [0, 0];
    while (d < 2) {
        force[d] = graph[d][tickCount];
        ball.acceleration[d] = force[d] / ball.mass;
        ball.velocity[d] += ball.acceleration[d] * tickLength;
        ball.position[d] += ball.velocity[d] * tickLength;
        d++;
    }

    cPositionHistory.push([...ball.position]);
    if (draw) updateCanvas();
    tickCount++;
}


function updateCanvas(){
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.beginPath();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.closePath();
    ctx.restore();
    drawTargetPoints();
    drawPoint(ball.position, "yellow", pointSize*2);
}

//loop

// HTML SETUP

function destroyWorkerPool() {
    for (const worker of workerPool) {
        worker.terminate();
    }
    workerPool.length = 0;
    workerIdle.length = 0;
    workerTaskResolvers = [];
}

    function updateElement(elementName, value){
      document.getElementById(elementName).innerHTML = value;
    }
    

    function updateStatusUI(running) {
      const statusElem = document.getElementById("runstatus");

      if (running) {
        statusElem.textContent = "Running";
        statusElem.classList.remove("stopped");
        statusElem.classList.add("running");
      } else {
        statusElem.textContent = "Stopped";
        statusElem.classList.remove("running");
        statusElem.classList.add("stopped");
      }
    }


  function toggleSettings() {
    const modal = document.getElementById("settingsModal");
    modal.classList.toggle("hidden");
  }

  function applySettings() {
    const settings = {
      inTIME: parseFloat(document.getElementById('inTIME').value),
      inGEN: parseInt(document.getElementById('inGEN').value),
      inMUT: parseInt(document.getElementById('inMUT').value),
      inSTR: parseFloat(document.getElementById('inSTR').value),
      inMUTC: parseFloat(document.getElementById('inMUTC').value),
      inWRK: parseInt(document.getElementById('inWRK').value),
      inPTZ: parseFloat(document.getElementById('inPTZ').value),
      usePointFormula: document.getElementById('usePointFormula').checked,
      pointFormula: document.getElementById('pointFormula').value,
      manualPoints: JSON.parse(document.getElementById('manualPoints').value),
      inCSZ: parseInt(document.getElementById('inCSZ').value),
      inBMS: parseFloat(document.getElementById('inBMS').value),
      inBSP: JSON.parse(document.getElementById('inBSP').value)
    };

    // Update
    inTIME = settings.inTIME;
    inGEN = settings.inGEN;
    inMUT = settings.inMUT;
    inSTR = settings.inSTR;
    inMUTC = settings.inMUTC;
    inWRK = settings.inWRK;
    inPTZ = settings.inPTZ;
    usePointFormula = settings.usePointFormula;
    pointFormula = settings.pointFormula;
    manualPoints = settings.manualPoints;
    inCSZ = settings.inCSZ;
    inBMS = settings.inBMS;
    inBSP = settings.inBSP;

    pointSize = inPTZ;
    target_points = generat_target_points(usePointFormula, pointFormula, manualPoints);
    tickLimit = Math.round((inTIME)/tickLength);

    forceGraphs = function(){
        let g = [];
        for(let i = 0; i < 1; i++){
            g.push([generateRandomGraph(tickLimit, startingMultiplier),generateRandomGraph(tickLimit, startingMultiplier)]);
        }
        return g;
    }();


    if(!firstRun){
        document.getElementById("continueButton").disabled = true;
    }
    
    destroyWorkerPool();
    updateCanvas();

    console.log("Applied Settings:", settings);
    toggleSettings(); // Close modal
  }
