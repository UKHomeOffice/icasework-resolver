/* eslint-disable consistent-return, no-console */
'use strict';

const winston = require('winston');
const { Consumer } = require('sqs-consumer');
const SubmitCase = require('./models/i-casework');
const GetCase = require('./models/i-casework-getcase');
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

const logError = (id, errorType, err) => {
  logger.log('error', id);
  logger.log('error', `${errorType} submission failed: ${err.status || '5xx'} - ${err}`);

  if (err.headers) {
    logger.log('error', err.headers['x-application-error-code']);
    logger.log('error', err.headers['x-application-error-info']);
  }
};

const submitAudit = async opts => {
  try {
    if (config.audit) {
      await db('resolver').insert(opts);
    }
  } catch (e) {
    const id = opts.caseID || 'N/A (Failed To Send)';
    logError(`iCasework Case ID ${id}`, 'Audit', e);
  }
};

const resolver = Consumer.create({
  queueUrl: config.aws.sqs,
  handleMessage: async message => {
    const getCase = new GetCase(JSON.parse(message.Body));
    const submitCase = new SubmitCase(JSON.parse(message.Body));

    try {
      const getCaseResponse = await getCase.fetch();
      const caseExists = getCaseResponse.status === 200;

      if (!caseExists) {
        const data = await submitCase.save();
        const caseID = data.createcaseresponse.caseid;

        logger.info({ caseID, message: 'Casework submission successful' });

        return submitAudit({ success: true, caseID });
      }
      logger.info({ caseID: submitCase.ExternalId, message: 'Case already submitted!' });
    } catch (e) {
      logError(`Case ExternalId ${submitCase.ExternalId}`, 'Casework', e);
      submitAudit({ success: false });
      throw e;
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
