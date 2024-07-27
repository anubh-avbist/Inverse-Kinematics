const segmentLength = 50;
const numlegs = 5;
const fps = 60;
const maxSpeed = 0.3;
const acceleration = 0.1;
const wobble = 0.1;
const canvasSize = 600;
const gravity = 5;
const fallThreshold = 0.9;
let floorLevel = 400;
let creature;
let time = 0;
let pressedKeys = {};
let edges = [];

function setup(){
	frameRate(fps);
	createCanvas(canvasSize,canvasSize);
	creature = new Body(numlegs); 
	edges.push(new Edge("linear", [0,floorLevel], [500,floorLevel-50], [250,250]));
	edges.push(new Edge("linear", [0,floorLevel], [500,floorLevel], [250,250]));
	edges.push(new Edge("linear", [0,floorLevel], [400,0], [250,250]));
	edges.push(new Edge("linear", [400,floorLevel], [400,0], [250,250]));
	//edges.push(new Edge("bezier", [0,0],[500,floorLevel],[[0,200],[250,200]]));
	
	
}

// Math

function getMagnitude(a){
	return Math.sqrt(Math.pow(a[0],2)+Math.pow(a[1],2));
}

function vector2Distance(a,b){
	return Math.sqrt(Math.pow((a[0]-b[0]),2)+Math.pow((a[1]-b[1]),2));
}

function getAngle(a,b){
	if(getMagnitude(a) == 0 || getMagnitude(b) == 0){
		return 0;
	}
	return Math.acos((a[0]*b[0] + a[1]*b[1])/(getMagnitude(a)*getMagnitude(b)));
} 

function addVector2(a,b){
	return [a[0]+b[0], a[1]+b[1]];
}

function subVector2(a,b){
	return [a[0]-b[0], a[1]-b[1]];
}

function scalarMultiply(scalar, v){
	return [v[0]*scalar,v[1]*scalar];
}

function bezierInterpolation(start, end, root, t){ 
	
	let x = Math.pow((1-t),2)*start[0] + 2*(1-t)*t*root[0]+t*t*end[0];
	let y = Math.pow((1-t),2)*start[1] + 2*(1-t)*t*root[1]+t*t*end[1];
	return[x,y];

}

function Newton(f, fPrime, x, root){
	
	return Math.min(Math.max(x + (f(x, root)/fPrime(x, root)), 0),1);
} 



// Classes

class Edge{
	constructor(type, start, end, nodes){
		this.type=type;
		this.start=start;
		this.end=end;
		
		if(type === "bezier"){
			this.nodes=nodes;
		}
	}

	get fun(){
		let start = this.start;
		let end = this.end;
		let nodes = this.nodes;
		if(this.type === "linear"){
			return function(t){
				return [lerp(start[0],end[0],t), lerp(start[1],end[1],t)];
			};
		} else if(this.type==="bezier"){
			return function(t){
				let output = [];
				for(let i = 0; i < 2; i++){
					
					let firstTerm = scalarMultiply(Math.pow((1-t),3),nodes[i]);
					let secondTerm = scalarMultiply(t*Math.pow((1-t),2),nodes[i]);
					let thirdTerm = scalarMultiply((1-t)*Math.pow(t,2),nodes[i]);
					let fourthTerm = scalarMultiply(Math.pow(t,3),nodes[i]);
					output.push(addVector2(addVector2(addVector2(firstTerm,secondTerm),thirdTerm),fourthTerm));
				}
				return output;
			};
		}
	}
	
	get distanceFun(){
		
		let start = this.start;
		let end = this.end;
		let nodes = this.nodes;
		let fun = this.fun;
		return function(t,r){
			return getMagnitude(subVector2(r, fun(t)));
		};
	}

	get distancePrime(){
		
		let start = this.start;
		let end = this.end;
		let nodes = this.nodes; 
		let distanceFun = this.distanceFun;
		if(this.type === "linear"){
			return function(t,r){ 
				let firstTerm = (start[0]*(1-t) + end[0]*t-r[0]);
				let secondTerm = (start[1]*(1-t) + end[1]*t-r[0]);
				let denominator = distanceFun(t,r);
				return (firstTerm*(start[0]-end[0]) + secondTerm*(start[1]-end[1]))/denominator;
			};
		}
		if(this.type === "bezier"){ // WORK HERE

		}
	}

	drawEdge(){
		if(this.type === "bezier"){
			
			beginShape();
			noFill();
			vertex(this.start[0],this.start[1]);
			bezierVertex(
				this.nodes[0][0],
				this.nodes[0][1],
				this.nodes[1][0],
				this.nodes[1][1],
				this.end[0],
				this.end[1]
			);

	
			endShape();

		} else if(this.type === "linear"){
			stroke(255,0,255);
			strokeWeight(5);
			line(this.start[0],this.start[1],this.end[0],this.end[1]);

		}
	}
	
}

class Platform{
	constructor(){
		this.edges = [];
	}
}

class Leg{
	constructor(root, dest){

		// Only 3 things needed to draw the leg
		this.root = root;
		this.rootAngle = Math.PI/2;
		this.jointAngle = 0;
		this.destination = dest;
		this.legSize = segmentLength; //-5+Math.random()*10;
		this.jointPos = [1,1];
		this.prevAngle = [0,0]; // [0] is root, [1] is joint;
		this.time = 0;
		this.anchored = false;
		this.newDestination = [0,0];
		this.orientation = 0;
		this.transitioning = false;
		this.stepHeight = 5;
		this.transTime = 0.4;
		this.startDestination = [0,0];
		this.tVal = 0.5;
	}

	debugStuff(){
		strokeWeight(1);
		fill(0,0,255);
		ellipse(this.destination[0],this.destination[1],10,10);
		fill(255);
		ellipse(this.newDestination[0],this.newDestination[1],10,10);
		fill(255,0,255);
		
		strokeWeight(5);
	}

	transition(){
		this.time += 1/fps;	
		
		if(this.time < this.transTime){
			let t = this.time/this.transTime;
			this.destination = bezierInterpolation(this.startDestination,this.newDestination,this.root,t);
			// If this destination is away again cuz you wersde moving, re-pick a new destination.
			if(getMagnitude(subVector2(this.root,this.newDestination))>this.legSize*2){
				this.pickDestination();
				this.startDestination = this.destination;
				this.time=0;
			}
		}

	}

	pickDestination(){ 
		let possibleTs = [];
		let possibleDestinations = [];
		edges.forEach(edge => {
			if(edge.type === "linear"){
				let i = 0;
				let tVal = this.tVal;
				let foundValue = false;
				while(i<30){

					if(edge.distanceFun(tVal,this.root) <= this.legSize*2){
						foundValue = true;
						break;
					} else {
						i++;
						
						tVal = Newton(edge.distanceFun, edge.distancePrime, tVal, this.root)+ (Math.random()*2-1)*0.05;
					}
				}
				if(foundValue){ 
					possibleTs.push(tVal);
					possibleDestinations.push(edge.fun(tVal));	
					this.tVal = tVal;
				} 
			}
			
		});
		
		if(possibleDestinations.length>0){
			
			let rand = Math.floor(Math.random()*possibleDestinations.length);
			this.newDestination = possibleDestinations[rand];

		}
	}

	IK(){
		this.jointPos = [
			this.root[0] + this.legSize*Math.cos(this.rootAngle), 
			this.root[1] + this.legSize*Math.sin(this.rootAngle)
		];
		
		 
		let dist = vector2Distance(this.destination,this.root);
		
		
		let refAngle = getAngle([1,0],subVector2(this.destination,this.root));
		if(this.destination[1]<this.root[1] ){
			refAngle*=-1;
		}


		if(dist <= this.legSize*2){ // If in range
			
			if(!this.anchored){ // randomize counter vs clock wise
				this.orientation = Math.round(Math.random());
			}
			this.anchored = true;
			let theta = Math.PI-Math.acos((dist*dist-2*(this.legSize*this.legSize))/(2*this.legSize*this.legSize));
			let phi = (Math.PI-theta)/2;

			this.rootAngle=lerp(this.rootAngle,refAngle-phi,1);
			this.jointAngle=lerp(this.jointAngle,this.rootAngle+Math.PI-theta,1);

			let firstSol = [refAngle-phi, refAngle-phi+Math.PI-theta];
			let secondSol = [refAngle+phi, refAngle+phi-Math.PI+theta];
			let solutions = [firstSol,secondSol];

			this.rootAngle = solutions[this.orientation][0];
			this.jointAngle = solutions[this.orientation][1];
			
			
		} else { // If out out range, straigthen out the leg.
			if(this.anchored || dist > this.legSize*2 && !this.transitioning){ // Transition Anchor

				console.log(time);
				// Set Up Transitioning
				this.transitioning = true;
				
				this.startDestination = this.destination;

				this.pickDestination();
				this.startDestination = this.destination;
				this.time = 0;
				this.anchored = false; 
			}

			if(Math.abs(this.rootAngle-refAngle)>1){
				this.rootAngle = refAngle;
				this.jointAngle = refAngle;
			}
			this.rootAngle = lerp(this.rootAngle,refAngle,0.5);
			this.jointAngle = lerp(this.jointAngle ,refAngle,0.5);
			
		}

		if(this.transitioning){
			
			this.transition();
		}
		this.prevAngle = [this.rootAngle,this.jointAngle];
	}
}


class Body{
	constructor(numLegs){
		this.x = 0;
		this.y = 0;
		this.legs = [];
		this.vel = [0,0];
		this.acc = [0,0]; 
		for(let i = 0; i < numLegs; i++){
			this.legs.push(new Leg([this.x,this.y], [Math.random()*500,floorLevel]));
		}
	}

	update(deltaTime){

		//let fallOffset = this.getAverageExtension()>fallThreshold ? gravity*2*(this.getAverageExtension()-fallThreshold) : 0;
		this.vel[0] += this.acc[0]; 
		this.vel[1] += this.acc[1];//+ fallOffset;

		if(getMagnitude(this.vel)>maxSpeed){
			let scale = maxSpeed/getMagnitude(this.vel);
			this.vel[0] *= scale;
			this.vel[1] *= scale;
		}

		this.x += this.vel[0]*deltaTime;
		this.y += this.vel[1]*deltaTime;
	}

	getAverageExtension(){
		let dist = 0;
		let num = 0;
		this.legs.forEach((leg) => {
			num++;
			dist += getMagnitude(subVector2([this.x,this.y],leg.destination))/(2*leg.legSize);
		});
		return dist/num;
	}
}

function findEnds(root, angle, length){ 
	return [root[0]+length*Math.cos(angle), root[1] + length*Math.sin(angle)];
}

function draw(){
	time+=1/fps;
	background(51);
	creature.acc = [0,0];
	if(pressedKeys.a){
		creature.acc[0] +=-acceleration;
	}
	if(pressedKeys.d){ 
		creature.acc[0] +=acceleration;
	}
	if(pressedKeys.w){
		creature.acc[1] +=-acceleration;
	}
	if(pressedKeys.s){
		creature.acc[1] +=acceleration;
	}
	if(!pressedKeys.a && !pressedKeys.s && !pressedKeys.d && !pressedKeys.w){
		creature.vel[0] = lerp(creature.vel[0],0,0.3);
		creature.vel[1] = lerp(creature.vel[1],0,0.3);
	}


	creature.update(deltaTime);

	// Draw floor

	fill(255);
	noStroke();
	
	noFill();
	
	strokeWeight(5);
	stroke(50,200,200);


	// Draw edges
	edges.forEach((edge) => {
		edge.drawEdge();
	});

	// Body
	stroke(50,200,200);
	ellipse(creature.x,creature.y,50,50);

	// For Each Leg
	for(let i = 0; i < creature.legs.length; i++){

		let leg = creature.legs[i];
		leg.root = [creature.x,creature.y];
		leg.IK();
		//leg.debugStuff();
		
		beginShape();
		noFill();
		vertex(creature.x,creature.y);
		bezierVertex(
			findEnds(leg.root,leg.rootAngle,leg.legSize)[0],
			findEnds(leg.root,leg.rootAngle,leg.legSize)[1], 
			findEnds(leg.root,leg.rootAngle,leg.legSize)[0],
			findEnds(leg.root,leg.rootAngle,leg.legSize)[1],
			findEnds(findEnds(leg.root,leg.rootAngle,leg.legSize), leg.jointAngle, leg.legSize)[0],
			findEnds(findEnds(leg.root,leg.rootAngle,leg.legSize), leg.jointAngle, leg.legSize)[1]
		);
		endShape();
	}
	
}


function keyPressed(){
	pressedKeys[key] = true;
}

function keyReleased(){
	delete pressedKeys[key];
}


