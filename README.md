# Legs Creature
Started off working on basic 2-joint inverse kinematics in 2D, ended up becoming a project about this leg creature travelling along various curves!

## The Math
- All off the environment 'floors' that the creature walks on are modeled by cubic bezier curves
- The leg-joint angles were calculated with basic trigonometry 
- The animation of each leg is modeled by a quadratic bezier path, with a node at the start point, the creature's body, and destination point, so that the creature 'lifts' its leg towards its body before stepping
- The destination for the foot of each leg is calculated using Newton's method: since the environment curves are all modeled with an exact mathematical equation, I just used the distance formula between the creature and a point on the curve parametrized by a variable t, and used Newton's method to find which value of t minimizes the distance, with a hint of randomness.

## Visual
All drawings are done with the p5.js library, just using ellipses and p5.js

