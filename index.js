const cluster = require('cluster');
const numCPUs = require('os').cpus().length;
const express = require('express');

// Check if the current process is the master process
if (cluster.isMaster) {
  // Fork worker processes based on the number of CPUs
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died`);
    // Fork a new worker if an existing worker dies
    cluster.fork();
  });
} else {
  const app = express();

  // Serve static files from the "public" directory
  app.use(express.static('public'));

  // Start the server
  const port = 3000;
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}
