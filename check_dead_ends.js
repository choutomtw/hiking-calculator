const fs = require('fs');
const connections = JSON.parse(fs.readFileSync('./src/data/connections.json', 'utf8'));

const allNodes = new Set(Object.keys(connections));
const destinationNodes = new Set();

Object.entries(connections).forEach(([start, targets]) => {
  Object.keys(targets).forEach(target => {
    destinationNodes.add(target);
  });
});

const deadEnds = [];
destinationNodes.forEach(node => {
  if (!allNodes.has(node)) {
    deadEnds.push(node);
  }
});

console.log('Dead ends:', deadEnds);
