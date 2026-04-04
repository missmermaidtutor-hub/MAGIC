const { createCanvas } = require('canvas');
const fs = require('fs');

const WIDTH = 1536;
const HEIGHT = 1024;

// Option A: Light sky blue top → pure white bottom
function generateOptionA() {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  gradient.addColorStop(0, '#ffffff');    // Pure white
  gradient.addColorStop(0.3, '#e3f3fb');  // Very pale blue
  gradient.addColorStop(0.55, '#c4e8f7'); // Pale blue
  gradient.addColorStop(0.8, '#a3d9f0');  // Softer blue
  gradient.addColorStop(1, '#7ec8e3');    // Light sky blue
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  return canvas.toBuffer('image/png');
}

// Option B: Lighter twilight → bright horizon → softer ocean
function generateOptionB() {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  gradient.addColorStop(0, '#2a4a7f');    // Soft twilight blue
  gradient.addColorStop(0.15, '#3d6eaa'); // Medium blue
  gradient.addColorStop(0.35, '#5d9ec9'); // Brighter blue
  gradient.addColorStop(0.5, '#8cc5e0');  // Light sky horizon
  gradient.addColorStop(0.65, '#5d9ec9'); // Brighter blue again
  gradient.addColorStop(0.85, '#2d5a8a'); // Medium ocean
  gradient.addColorStop(1, '#1a3d6b');    // Softer deep blue
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  return canvas.toBuffer('image/png');
}

fs.writeFileSync('gradient-option-a.png', generateOptionA());
fs.writeFileSync('gradient-option-b.png', generateOptionB());
console.log('Generated lighter gradient-option-a.png and gradient-option-b.png');
