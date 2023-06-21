const cluster = require('cluster');
const numCPUs = require('os').cpus().length;
const express = require('express');
const fs = require('fs');
const path = require('path');

// Check if the current process is the master process
if (cluster.isMaster) {
  // Track the current load on the first core and the second core worker
  let firstCoreLoad = 0;
  let secondCoreWorker = null;

  // Fork worker processes based on the number of CPUs except the second one
  for (let i = 0; i < numCPUs; i++) {
    if (i !== 1) {
      cluster.fork();
    }
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died`);
    // Fork a new worker if an existing worker dies
    cluster.fork();
  });

  // Update the first core load and manage second core worker
  setInterval(() => {
    const workers = Object.values(cluster.workers);
    const firstCoreWorker = workers[0];
    if (firstCoreWorker && firstCoreWorker.process) {
      const cpuUsage = firstCoreWorker.process.cpuUsage();
      const totalUsage = cpuUsage.user + cpuUsage.system;
      const loadPercentage = (totalUsage / 1000000) * 100; // Convert to percentage
      firstCoreLoad = loadPercentage;

      // Check if the second core worker needs to be stopped or started
      if (firstCoreLoad >= 90 && !secondCoreWorker) {
        secondCoreWorker = cluster.fork();
        console.log('Second core worker started');
      } else if (firstCoreLoad < 90 && secondCoreWorker) {
        secondCoreWorker.kill();
        secondCoreWorker = null;
        console.log('Second core worker stopped');
      }
    }
  }, 1000);
} else {
  const app = express();

  // Serve static files from the "public" directory
  app.use(express.static('site'));

  // Inject the style.css file into the head of HTML files
  app.use((req, res, next) => {
    if (req.url.endsWith('.html')) {
      const filePath = path.join(__dirname, 'site', req.url);
      fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
          return next();
        }

        const modifiedData = data.replace(
          '<head>',
          `<head><link rel="stylesheet" href="style.css">`
        );
        res.send(modifiedData);
      });
    } else {
      next();
    }
  });

  // Start the server
  const port = 3000;
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}
