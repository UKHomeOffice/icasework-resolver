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
    throw new Error('Audit Error');
  }
};

const submitDuplicate = async opts => {
  try {
    if (config.audit) {
      await db('duplicates').insert(opts);
    }
  } catch (e) {
    const id = opts.case_id || 'N/A (Failed to send)';
    logError(`iCasework Case ID ${id}`, 'Duplicate', e);
    throw new Error('Duplicate Audit Error');
  }
};

const resolver = Consumer.create({
  queueUrl: config.aws.sqs,
  handleMessage: async message => {
    const getCase = new GetCase(JSON.parse(message.Body));
    const submitCase = new SubmitCase(JSON.parse(message.Body));
    const externalId = getCase.get('ExternalId');

    try {
      const getCaseResponse = await getCase.fetch();
      const icwID = getCaseResponse.caseId;

      if (!getCaseResponse.exists) {
        const data = await submitCase.save();
        const caseID = data.createcaseresponse.caseid;

        logger.info({ caseID, message: 'Casework submission successful' });
        submitDuplicate( {duplicate: false, case_id: caseID, external_id: externalId });
        return submitAudit({ success: true, caseID });
      }
      logger.info({ externalId, message: `Case already submitted with iCasework Case ID ${icwID}` });
      submitDuplicate( {duplicate: true, case_id: icwID, external_id: externalId });
      return submitAudit({ success: true, caseID: icwID });
    } catch (e) {
      if (e.message !== 'Audit Error') {
        logError(`Case ExternalId ${externalId}`, 'Casework', e);
      }
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
