/* eslint-disable consistent-return, no-console */
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
  db = require('./db');
}

const logger = winston.createLogger({
  transports,
  format: winston.format.json()
});

const logError = (type, e) => {
  logger.log('error', `${type} submission failed status: ${e.status || '5xx'}`);
  logger.log('error', `${type} submission failed message: ${e}`);

  if (e.headers) {
    logger.log('error', e.headers['x-application-error-code']);
    logger.log('error', e.headers['x-application-error-info']);
  }
};

const submitAudit = async opts => {
  try {
    if (config.audit) {
      await db('resolver').insert(opts);
    }
  } catch (e) {
    logError('Audit', e);
  }
};

const resolver = Consumer.create({
  queueUrl: config.aws.sqs,
  handleMessage: async message => {
    try {
      console.log(JSON.parse(message.Body));
      const casework = new Casework(JSON.parse(message.Body));
      const data = await casework.save();
      const caseID = data.createcaseresponse.caseid;

      logger.info({ caseID, message: 'Casework submission successful' });

      return submitAudit({ success: true, caseID });
    } catch (e) {
      logError('Casework', e);
      return submitAudit({ success: false });
    }
  }
});

resolver.on('error', err => {
  console.error(err.message);
});

resolver.on('processing_error', err => {
  console.error(err.message);
});

resolver.start();

logger.info(`Resolver is listening for messages from: ${config.aws.sqs}`);
