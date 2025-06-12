//Canvas setup
const canvas = document.getElementById("canvas");
canvas.height = canvas.width = 400;
const ctx = canvas.getContext("2d");
var pointSize = 0.1;

var realTimeMode = false; // false = batch, true = real-time
var tickCount = 0;
var tickLength = 1/64;


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
        [x, y] = target_points[i];
        drawPoint([x, y], "white", pointSize);
    }
}

function distance([x1, y1], [x2, y2]) {
    return Math.hypot(x2 - x1, y2 - y1);
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
let pcount = 10
let i = 0;
while(i < pcount){
    rand_target_points.push([i, (Math.sin(i))]);
    i++;
}
const target_points = rand_target_points;
/*const target_points = [
    [0,0],
    [1,1],
    [2,2],
    [3,3]
];*/

const space = (function(){
        let minX = function(){
        let minX = target_points[0][0];
        target_points.forEach(point =>{
            if(point[0] < minX)minX = point[0];
        })
        return minX;
    }()
    let minY = function(){
        let minY = target_points[0][1];
        target_points.forEach(point =>{
            if(point[1] < minY)minY = point[1];
        })
        return minY;
    }()
    let maxX = function(){
        let maxX = target_points[0][0];
        target_points.forEach(point =>{
            if(point[0] > maxX)maxX = point[0];
        })
        return maxX;
    }()
    let maxY = function(){
        let maxY = target_points[0][1];
        target_points.forEach(point =>{
            if(point[1] > maxY)maxY = point[1];
        })
        return maxY;
    }()
    

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
    console.log("ITERATION ",(i+1).toString()," COMPELITE");
}
//console.log(aPositionHistory);
var minDistanceForEachTargetOfEachGraph = [];
aPositionHistory.forEach(graph => {
    let minDistanceForEachTargetOfThisGraph = [];
    for(let point of target_points){
        let minDistanceToPoint;
        let currentDistanceToPoint;
        graph.forEach(ballPosition =>{
            
            currentDistanceToPoint = distance(ballPosition, point);
            if(minDistanceToPoint === undefined || minDistanceToPoint > currentDistanceToPoint)
                minDistanceToPoint = currentDistanceToPoint;
        })
        minDistanceForEachTargetOfThisGraph.push(minDistanceToPoint);
    }
    minDistanceForEachTargetOfEachGraph.push(minDistanceForEachTargetOfThisGraph);
});
var totalMinDistanceForEachGraph = function(){
    let out = [];
    minDistanceForEachTargetOfEachGraph.forEach(graph =>{
        let sum = 0;
        graph.forEach(d => {
            sum += d;
        });
        out.push(sum);
    });
    return out;
}();
//console.log(totalMinDistanceForEachGraph);
var bestGraph = indexOfSmallest(totalMinDistanceForEachGraph);
//console.log(forceGraphs[bestGraph])
//console.log(bestGraph)

let optimizedBestGraph = optimizeGraph(forceGraphs[bestGraph], 1000, 1000, 3);


// --------------- NEW GRAPHS! -------------------------

function mutateGraph(graph, strength = 0.2) {
    let mutated = [[], []];
    for (let d = 0; d < 2; d++) {
        for (let t = 0; t < graph[d].length; t++) {
            let original = graph[d][t];
            let variation = (Math.random() - 0.5) * strength; // small delta
            mutated[d].push(original + variation);
        }
    }
    return mutated;
}

function optimizeGraph(initialGraph, generations = 50, mutationsPerGen = 10, mutationStrength = 0.2) {
    let currentBest = initialGraph;

    let lastScore = 0;
    let currentScore;
    let stuckCount = 0;
    let stuck = false;
    for (let gen = 0; gen < generations; gen++) {
        let candidates = [currentBest];
        let strength = mutationStrength;

        if(stuck) strength *= currentScore;

        // Generate mutated variations
        for (let i = 0; i < mutationsPerGen; i++) {
            candidates.push(mutateGraph(currentBest, strength));
        }

        // Simulate all candidates
        let results = simulateGraphSet(candidates);

        // Find the best one
        const bestIndex = indexOfSmallest(results.totalDistances);
        currentBest = candidates[bestIndex];

        console.log((stuck? '\x1b[31m':"")+`Generation ${gen + 1}: Best Score = ${results.totalDistances[bestIndex]}`);
        currentScore = results.totalDistances[bestIndex];
        if(currentScore == lastScore && !stuck) stuckCount++;
        if(currentScore != lastScore) stuckCount = 0;
        lastScore = currentScore;
        if(stuckCount >= 5 && !stuck){
            stuck = true;
            console.log('\x1b[31m'+"stuck mode on")    
        }
        if(stuckCount < 5 && stuck){
            stuck = false;
            console.log('\x1b[32m'+"stuck mode off")
        }
    }

    return currentBest;
}

var optimizedGraphSet = [];

function simulateGraphSet(graphSet) {
    const results = {
        totalDistances: [],
        positionHistories: []
    };

    for (let i = 0; i < graphSet.length; i++) {
        tickCount = 0;
        ball.position = [0.0, 0.0];
        ball.velocity = [0.0, 0.0];
        ball.acceleration = [0.0, 0.0];
        cPositionHistory = [];

        while (tickCount <= tickLimit) {
            simulation_tick_graph(graphSet[i], false); // simulate with this graph
        }

        results.positionHistories.push(cPositionHistory);

        // Calculate total distance to targets
        let totalDist = 0;
        for (let target of target_points) {
            const distances = cPositionHistory.map(pos => distance(pos, target));
            //const avgDist = distances.reduce((sum, d) => sum + d, 0) / distances.length;
            const minDist = Math.min(...distances);
            //totalDist += avgDist + minDist; // mixed metric
            totalDist += minDist;
        }

        results.totalDistances.push(totalDist);
    }
    optimizedGraphSet = graphSet;
    return results;
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
