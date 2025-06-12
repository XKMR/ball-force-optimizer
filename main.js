//Canvas setup
const canvas = document.getElementById("canvas");
canvas.height = canvas.width = 400;
const ctx = canvas.getContext("2d");
var pointSize = 0.1;

var realTimeMode = false; // false = batch, true = real-time
var tickCount = 0;
var tickLength = 1/64;
var optimizedBestGraph;

function updateMargin(){
    let margin = parseInt(document.getElementById("margin").value)/100;
    let x_transform = canvas.width/(space[1][0]-space[0][0])*margin;
    let y_transform = canvas.height/(space[1][1]-space[0][1])*margin;
    let transform = Math.min(x_transform, y_transform);
    let x_offset = (canvas.width - (canvas.width*margin))/2;
    let y_offset = (canvas.height - (canvas.width*margin))/2;

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

//--------- GENERATE POINTS ------------

var rand_target_points = [];
let pcount = 100
let i = 0;
while(i < pcount){
    rand_target_points.push([Math.round(Math.random()*100), Math.round(Math.random()*100)]);
    i++;
}
//const target_points = rand_target_points;
const target_points = [
    [0,0],
    [2,4],
    [4,0],
    [5,5]
];

const space = (function(){
    
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
var started = false;
stop();



var ball = {
    position: [-1, -1],
    velocity: [0,0],
    acceleration: [1,0],
    mass: 1
}

// --------------- GENERATE FORCE ----------------------
const tickLimit = Math.round((1)/tickLength); //number is in seconds

function generate_rand_graph(length, strength){
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
const workerCode = `
self.onmessage = function(e) {
    
    const { graphs, tickLimit, tickLength, target_points } = e.data;

    function distance([x1, y1], [x2, y2]) {
        let dx = x2 - x1, dy = y2 - y1;
        return dx * dx + dy * dy;
    }

    function simulateGraph(graph) {
        let tickCount = 0;
        let ball = {
            position: [0.0, 0.0],
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
        g.push([generate_rand_graph(tickLimit, startingMultiplier),generate_rand_graph(tickLimit, startingMultiplier)]);
    }
    return g;
}();
//console.log(forceGraphs);
for(let i = 0; i < forceGraphs.length; i++){

    tickCount = 0;
    cPositionHistory = [];

    ball.position = [0.0, 0.0];
    ball.velocity = [0.0, 0.0];
    ball.acceleration = [0.0, 0.0];

    while(tickCount <= tickLimit){
        simulation_tick(i);
    }
    aPositionHistory.push(cPositionHistory);
    //console.log("ITERATION ",(i+1).toString()," COMPELITE");
}
//console.log(aPositionHistory);
var minDistanceForEachTargetOfEachGraph = [];
for(let graph of aPositionHistory){
    let minDistanceForEachTargetOfThisGraph = [];
    for(let point of target_points){
        let minDistanceToPoint;
        let currentDistanceToPoint;
        for(let ballPosition of graph){
            
            currentDistanceToPoint = distance(ballPosition, point);
            if(minDistanceToPoint === undefined || minDistanceToPoint > currentDistanceToPoint)
                minDistanceToPoint = currentDistanceToPoint;
        }
        minDistanceForEachTargetOfThisGraph.push(minDistanceToPoint);
    }
    minDistanceForEachTargetOfEachGraph.push(minDistanceForEachTargetOfThisGraph);
}
var totalMinDistanceForEachGraph = function(){
    let out = [];
    for(let graph of minDistanceForEachTargetOfEachGraph){
        let sum = 0;
        for(let d of graph){
            sum += d;
        }
        out.push(sum);
    }
    return out;
}();
//console.log(totalMinDistanceForEachGraph);
var bestGraph = indexOfSmallest(totalMinDistanceForEachGraph);
//console.log(forceGraphs[bestGraph])
//console.log(bestGraph)

//var optimizedBestGraph;

(async () => {
    optimizedBestGraph = await optimizeGraph(forceGraphs[bestGraph], 1000, 1000, 3);
})();


// --------------- NEW GRAPHS! -------------------------

function mutateGraph(graph, strength = 0.2) {
    let mutated = [[], []];
    for (let d = 0; d < 2; d++) {
        for (let t = 0; t < graph[d].length; t++) {
            if (Math.random() < 0.1) { // mutate only 10% of ticks
                let variation = (Math.random() - 0.5) * strength;
                mutated[d][t] = graph[d][t] + variation;
            } else {
                mutated[d][t] = graph[d][t];
            }
        }
    }
    return mutated;
}


async function optimizeGraph(initialGraph, generations = 50, mutationsPerGen = 10, mutationStrength = 0.2) {
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

        console.log((stuck ? '\x1b[31m' : "") + `Generation ${gen + 1}: Best Score = ${results.totalDistances[bestIndex]}`);
        currentScore = results.totalDistances[bestIndex];

        if(currentScore == lastScore && !stuck) stuckCount++;
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
    }

    return currentBest;
}

var optimizedGraphSet = [];

async function simulateGraphSet(graphSet) {
    const numWorkers = 5;
    setupWorkerPool(numWorkers);

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
                target_points
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
    realTimeMode = true;
    tickCount = 0;

    // Reset ball state
    ball.position = [0.0, 0.0];
    ball.velocity = [0.0, 0.0];
    ball.acceleration = [0.0, 0.0];
    cPositionHistory = [];

    startRealTimeLoop();
}

function startRealTimeLoop(){
    started = true;

    const loop = setInterval(() => {
        if (!started || tickCount > tickLimit) {
            clearInterval(loop);
            realTimeMode = false;
            return;
        }
        simulation_tick_graph(optimizedBestGraph, draw = true) // draw = true
        
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


function start(){
    destroyWorkerPool();
    started = true;
    ball.velocity = [0.0, 0.0];
    var loop = window.setInterval(function(){
    if(!started) clearInterval(loop);
        simulation_tick_graph(optimizedBestGraph, draw = true)
    }, (tickLength*1000));
    document.getElementById("runstatus").innerText = "true";
    document.getElementsByClassName("runstatus")[0].style.color = "#00DC00";
    document.getElementsByClassName("runstatus")[1].style.color = "#00DC00";
    
}
function stop(){
    started = false;
    document.getElementById("runstatus").innerText = "false";
    document.getElementsByClassName("runstatus")[0].style.color = "#DC0000";
    document.getElementsByClassName("runstatus")[1].style.color = "#DC0000";
}
function destroyWorkerPool() {
    for (const worker of workerPool) {
        worker.terminate();
    }
    workerPool.length = 0;
    workerIdle.length = 0;
    workerTaskResolvers = [];
}
