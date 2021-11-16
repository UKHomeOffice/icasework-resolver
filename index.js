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

const submitAudit = async (table, opts) => {
  try {
    if (config.audit) {
      if (table === 'duplicates') {
        // eslint-disable-next-line no-unused-vars
        const{success, ...duplicatesOpts} = opts;
        await db(table).insert(duplicatesOpts);
      }
      // eslint-disable-next-line no-unused-vars
      const{externalID, ...resolverOpts} = opts;
      await db('resolver').insert(resolverOpts);
    }
  } catch (e) {
    const id = opts.caseID || 'N/A (Failed To Send)';
    logError(`iCasework Case ID ${id}`, 'Audit', e);
    throw new Error('Audit Error');
  }
};

const resolver = Consumer.create({
  queueUrl: config.aws.sqs,
  handleMessage: async message => {
    const getCase = new GetCase(JSON.parse(message.Body));
    const submitCase = new SubmitCase(JSON.parse(message.Body));
    const externalID = submitCase.get('ExternalId');

    try {
      const getCaseResponse = await getCase.fetch();
      let caseID = getCaseResponse.caseId;

      if (!getCaseResponse.exists) {
        const data = await submitCase.save();
        caseID = data.createcaseresponse.caseid;

        logger.info({ caseID, message: 'Casework submission successful' });
        return submitAudit('resolver', { success: true, case_ID, externalID});
      }
      logger.info({ externalID, message: `Case already submitted with iCasework Case ID ${caseID}` });
      return submitAudit('duplicates', { success: true, caseID, externalID });
    } catch (e) {
      if (e.message !== 'Audit Error') {
        logError(`Case ExternalId ${externalID}`, 'Casework', e);
      }
      return submitAudit('resolver', { success: false});
      // throw new Error('Unexpected message handler failure: ');
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
