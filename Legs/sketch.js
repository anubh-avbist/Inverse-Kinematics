const segmentLength = 50;
const numlegs = 3;
const fps = 30;
let floorLevel = 400;
let creature;
let time = 0;

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



class Leg{
	constructor(root, dest){

		// Only 3 things needed to draw the leg
		this.root = root;
		this.rootAngle = Math.PI/2;
		this.jointAngle = 0;
		this.destination = dest;
		this.legSize = segmentLength; //-5+Math.random()*10;
		this.jointPos = [1,1];
		this.footPos = [0,0];
		this.prevAngle = [0,0]; // [0] is root, [1] is joint;
		this.time = 0;
		this.anchored = false;
		this.newDestination = [0,0];
		this.orientation = 0;
		this.transitioning = false;
		this.stepHeight = 5;
		this.transTime = 0.4;
		this.startDestination = [0,0];
	}

	debugStuff(){
		strokeWeight(1);
		fill(0,0,255);
		ellipse(this.destination[0],this.destination[1],10,10);
		fill(255);
		//ellipse(this.jointPos[0],this.jointPos[1],10,10);
		fill(255,0,255);
		//ellipse(this.footPos[0],this.footPos[1],10,10);
		strokeWeight(5);
	}

	transition(){
		this.time += 1/fps;	
		
		if(this.time < this.transTime){
			
			let t = this.time/this.transTime;
			t = Math.sin(Math.PI/2*t);
			
			
			this.destination = bezierInterpolation(this.startDestination,this.newDestination,this.root,this.time/this.transTime);

			// Workable method (ish)
			/*this.destination[0] = lerp(this.destination[0],this.newDestination[0], this.time/this.transTime);
			let verticalOrientation = (floorLevel-this.root[1])/Math.abs(this.root[1]-floorLevel);
			this.destination[1] = this.newDestination[1]-verticalOrientation*Math.sin(this.time/this.transTime*Math.PI)*this.stepHeight;
			*/
			// Slerp

			// this.destination = slerp(this.preTransDestination,this.newDestination,this.root,this.time/this.transTime);
		
		} else {
			this.transitioning = false;
		}

	}


	IK(){
		
		this.jointPos = [
			this.root[0] + this.legSize*Math.cos(this.rootAngle), 
			this.root[1] + this.legSize*Math.sin(this.rootAngle)
		];
		this.footPos = [
			this.jointPos[0] + this.legSize*Math.cos(this.jointAngle), 
			this.jointPos[1] + this.legSize*Math.sin(this.jointAngle)
		];

		
		let dist = vector2Distance(this.destination,this.root);
		
		this.footPos[0] = lerp(this.footPos[0], this.destination[0], 0.5);
		this.footPos[1] = lerp(this.footPos[1], this.destination[1], 0.5);
		if(getMagnitude(subVector2(this.footPos,this.jointPos))>this.legSize){
			let scaleFactor = 1;
			this.footPos[0]*=scaleFactor;
			this.footPos[1]*=scaleFactor;
		}
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
			this.footPos = lerp(this.footPos,this.destination,0.5);
			
		} else { // If out out range, straigthen out the leg.
			if(this.anchored || dist > this.legSize*3){ // Transition Anchor

				// Set Up Transitioning
				this.transitioning = true;
				this.stepHeight = Math.random()*15+10;
				this.startDestination[0] = this.destination[0];
				this.newDestination[0] = this.root[0]+(this.root[0]-this.destination[0])*Math.random()*0.8;
				this.newDestination[1] = floorLevel;
				this.startDestination = this.destination;
				this.time = 0;
			}

			
			this.anchored = false; 
			//console.log(Math.abs(this.rootAngle-refAngle));
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
		for(let i = 0; i < numLegs; i++){
			this.legs.push(new Leg([this.x,this.y], [Math.random()*500,floorLevel]));
		}
	}
}

function findEnds(root, angle, length){ 
	return [root[0]+length*Math.cos(angle), root[1] + length*Math.sin(angle)];
}
             
function setup(){
	frameRate(fps);
	createCanvas(500,500);
	creature = new Body(numlegs); 
	
}

function draw(){
	time+=1/fps;
	background(51);
	creature.x=lerp(creature.x,mouseX, 0.5);
	creature.y=lerp(creature.y,mouseY,0.5);

	// Draw floor
	fill(255);
	noStroke();
	rect(0,floorLevel,500,500);
	noFill();
	
	strokeWeight(5);
	stroke(50,200,200);

	// Body
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
