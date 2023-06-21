const fs = require('fs');
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;
const express = require('express');
const cheerio = require('cheerio');

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
  app.use(express.static('site'));

  // Middleware to inject style.css into the head of HTML files
  app.use((req, res, next) => {
    const filePath = __dirname + '/public' + req.url;
    if (filePath.endsWith('.html')) {
      fs.readFile(filePath, 'utf8', (err, html) => {
        if (err) {
          console.error(`Error reading file: ${filePath}`);
          return res.status(500).send('Internal Server Error');
        }

        const $ = cheerio.load(html);
        const head = $('head');
        const styleTag = `<link rel="stylesheet" type="text/css" href="/style.css">`;

        // Append the style.css link tag to the head of the HTML file
        head.append(styleTag);

        // Get the modified HTML content
        const modifiedHtml = $.html();

        res.send(modifiedHtml);
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
