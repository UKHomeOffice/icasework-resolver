/* eslint-disable consistent-return, no-console */
'use strict';

const { createLogger, format, transports } = require('winston');
const { combine, timestamp, json } = format;
const { Consumer } = require('sqs-consumer');
const SubmitCase = require('./models/i-casework');
const GetCase = require('./models/i-casework-getcase');
const config = require('./config');
const logger = createLogger({
  format: combine(
    timestamp(),
    json()
  ),
  transports: [
    new transports.Console({level: 'info',
      handleExceptions: true
    })]
});
let db;

if (config.audit) {
  db = require('./db');
}

const logError = (id, errorType, err) => {
  logger.log('error', id);
  logger.log('error', `${errorType} submission failed: ${err.status || '5xx'} - ${err}`);

  if (err.headers) {
    logger.log('error', err.headers['x-application-error-code']);
    logger.log('error', err.headers['x-application-error-info']);
  }
};

const submitAudit = (type, opts) => {
  if (!config.audit) {
    return Promise.resolve();
  }
  return db(type).insert(opts).catch(e => {
    throw new Error(`Audit Error - ${e.message || e}`);
  });
};

const handleError = async (caseID, externalID, reject, err) => {
  const id = caseID || 'N/A (Failed To Send)';

  if (!err.message.includes('Audit Error')) {
    logError(`Case externalID ${externalID} - iCasework Case ID ${id}`, 'Casework', err);
  }

  try {
    await submitAudit('resolver', { success: false, caseID, externalID });
    return reject(err);
  } catch (auditErr) {
    logError(`iCasework Case ID ${id} - ExternalId ${externalID}`, 'Audit', auditErr);
    return reject(auditErr);
  }
};

const resolver = Consumer.create({
  queueUrl: config.aws.sqs,
  handleMessage: async message => {
    return new Promise(async (resolve, reject) => {
      const getCase = new GetCase(JSON.parse(message.Body));
      const submitCase = new SubmitCase(JSON.parse(message.Body));
      const externalID = submitCase.get('ExternalId');
      let caseID;

      try {
        const getCaseResponse = await getCase.fetch();
        caseID = getCaseResponse.caseId;

        if (!getCaseResponse.exists) {
          const data = await submitCase.save();
          caseID = data.createcaseresponse.caseid;

          logger.info({ caseID, message: 'Casework submission successful' });

          await submitAudit('resolver', { success: true, caseID, externalID });
          return resolve();
        }

        logger.info({ externalID, message: `Case already submitted with iCasework Case ID ${caseID}` });

        await submitAudit('duplicates', { caseID, externalID });
        await submitAudit('resolver', { success: true, caseID, externalID });
        return resolve();
      } catch (e) {
        return handleError(caseID, externalID, reject, e);
      }
    });
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
