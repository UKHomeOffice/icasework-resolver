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
let db;

if (config.audit) {
  db = require("./db");
}

const logger = winston.createLogger({
  transports,
  format: winston.format.json()
});

const resolver = Consumer.create({
  queueUrl: config.aws.sqs,
  handleMessage: async (message) => {
    return new Promise(function(resolve, reject) {
      const casework = new Casework(JSON.parse(message.Body));

      casework.save()
          .then(data => {
            logger.info({
              message: 'Casework submission successful',
              caseID: data.createcaseresponse.caseid
            });
            if (config.audit) {
              return db('resolver').insert({
                caseID: data.createcaseresponse.caseid,
                success: true
              }).then(() => {
                resolve();
              }).catch(error => {
                reject(error);
              });
            } else {
              resolve();
            }
          })
          .catch(e => {
            logger.log('error', `Casework submission failed: ${e.status}`);
            if (e.headers) {
              logger.log('error', e.headers['x-application-error-code']);
              logger.log('error', e.headers['x-application-error-info']);
            }

            if (config.audit) {
              return db('resolver').insert({
                success: false
              }).then(() => {
                reject(e);
              }).catch(error => {
                reject(error);
              });
            } else {
              reject(e);
            }
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
