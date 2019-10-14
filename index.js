'use strict';

const { Consumer } = require('sqs-consumer');
const Casework = require('./models/i-casework');
const config = require('./config');
const StatsD = require('hot-shots');
const client = new StatsD();

const resolver = Consumer.create({
  queueUrl: config.aws.sqs,
  handleMessage: async (message) => {
    return new Promise(function(resolve, reject) {
      const casework = new Casework(JSON.parse(message.Body));

      casework.save()
          .then(data => {
            client.increment('casework.submission.success');
            resolve(data);
          })
          .catch(e => {
            client.increment('casework.submission.failed');
            reject(new Error(`ERROR: i-Casework submission failed. Error code: ${e.headers['x-application-error-code']}, error message: ${e.headers['x-application-error-info']}`));
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
