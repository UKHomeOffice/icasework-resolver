'use strict';

const winston = require('winston');
const { Consumer } = require('sqs-consumer');
const Casework = require('./models/i-casework');
const config = require('./config');
const transports = [
  new winston.transports.Console({
    level: 'info',
    handleExceptions: true
  })
];

const logger = winston.createLogger({
  transports,
  format: winston.format.json()
});

// Prometheus metrics
const http = require('http');
const client = require('prom-client');
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ timeout: 5000 });
const icaseworkSuccess = new client.Counter({
  name: 'casework_submission_success',
  help: 'metric_help'
});
const icaseworkFailed = new client.Counter({
  name: 'casework_submission_failed',
  help: 'metric_help'
});

const server = http.createServer((req, res) => {
  res.end(client.register.metrics());
});

server.listen(8080, (err) => {
  if (err) {
    return logger.error(err);
  }

  logger.info('Prometheus client is serving over http://localhost:8080/');
});

const resolver = Consumer.create({
  queueUrl: config.aws.sqs,
  handleMessage: async (message) => {
    return new Promise(function(resolve, reject) {
      const casework = new Casework(JSON.parse(message.Body));

      casework.save()
          .then(data => {
            icaseworkSuccess.inc();
            logger.info({
              message: 'Casework submission successful',
              caseID: data.createcaseresponse.caseid
            });
            resolve();
          })
          .catch(e => {
            icaseworkFailed.inc();
            logger.log('error', `Casework submission failed: ${e.status}`);
            if (e.headers) {
              logger.log('error', e.headers['x-application-error-code']);
              logger.log('error', e.headers['x-application-error-info']);
            }
            console.log(e);
            reject(e);
          });

    });
  }
});

resolver.on('error', (err) => {
  console.error(err.message);
});

resolver.on('processing_error', (err) => {
  console.error(err.message);
});

resolver.start();

logger.info(`Resolver is listening for messages from: ${config.aws.sqs}`);