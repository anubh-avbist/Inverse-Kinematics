const segmentLength = 50;
let creature;



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

function getTerminalAngle(a){
	let angle = getAngle(a,[1,0]);
}

function addVector2(a,b){
	return [a[0]+b[0], a[1]+b[1]];
}


function subVector2(a,b){
	return [a[0]-b[0], a[1]-b[1]];
}



class Leg{
	constructor(root){

		// Only 3 things needed to draw the leg
		this.root = root;
		this.rootAngle = Math.PI/2;
		this.jointAngle = 0;
		this.destination = [250,250]; 
		this.legSize = segmentLength;
		this.jointPos = [1,1];
		this.footPos = [0,0];
		this.prevAngle = 0;
	}

	debugStuff(){
		strokeWeight(1);
		fill(0,0,255);
		ellipse(this.destination[0],this.destination[1],10,10);
		fill(255);
		//ellipse(this.jointPos[0],this.jointPos[1],10,10);
		fill(255,0,255);
		//ellipse(this.footPos[0],this.footPos[1],10,10);
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
			let theta = Math.PI-Math.acos((dist*dist-2*(this.legSize*this.legSize))/(2*this.legSize*this.legSize));
			let phi = (Math.PI-theta)/2;
			this.rootAngle=lerp(this.rootAngle,refAngle+phi,0.5  );
			this.jointAngle=lerp(this.jointAngle,this.rootAngle-Math.PI+theta,0.5);
			this.footPos = lerp(this.footPos,this.destination,0.5);
			//this.jointAngle=this.rootAngle-theta;
		} else { // If out out range, straigthen out the leg.
			this.rootAngle = lerp(this.rootAngle,refAngle,0.5);
			this.jointAngle = lerp(this.jointAngle ,refAngle,0.5);
		}

	}
}


class Body{
	constructor(numLegs){
		this.x = 0;
		this.y = 0;
		this.legs = [];
		for(let i = 0; i < numLegs; i++){
			this.legs.push(new Leg([this.x,this.y]));
		}
	}
}

function findEnds(root, angle, length){
	return [root[0]+length*Math.cos(angle), root[1] + length*Math.sin(angle)];
}

function setup(){
	createCanvas(500,500);
	creature = new Body(1);
	
}

function draw(){



	background(51);
	creature.x=lerp(creature.x,mouseX, 0.5);
	creature.y=lerp(creature.y,mouseY,0.5);

	// Body
	ellipse(creature.x,creature.y,50,50);

	// For Each Leg

	for(let i = 0; i < creature.legs.length; i++){

		let leg = creature.legs[i];
		leg.root = [creature.x,creature.y];
		
		leg.IK();
		leg.debugStuff();
		strokeWeight(5);
		stroke(5);
		fill(5);

		line(creature.x,creature.y, findEnds(leg.root,leg.rootAngle,segmentLength)[0],findEnds(leg.root,leg.rootAngle,segmentLength)[1]);

		line(
			findEnds(leg.root,leg.rootAngle,segmentLength)[0],
			findEnds(leg.root,leg.rootAngle,segmentLength)[1],
			findEnds(findEnds(leg.root,leg.rootAngle,segmentLength), leg.jointAngle, segmentLength)[0],
			findEnds(findEnds(leg.root,leg.rootAngle,segmentLength), leg.jointAngle, segmentLength)[1]
		);

	}

}

function keyPressed(){
	if (key == ' '){ 
	  creature.legs[0].destination=[Math.random()*250,Math.random()*250];
	}  
}