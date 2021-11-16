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

const submitAudit = (type, opts) => {
  return !config.audit ?
    Promise.resolve() :
    db(type).insert(opts).catch(e => {
      throw new Error('Audit Error');
    });
};

const handleError = async (caseID, externalID, reject, err) => {
  const id = caseID || 'N/A (Failed To Send)';

  if (err.message !== 'Audit Error') {
    logError(`Case externalID ${externalID} - iCasework Case ID ${id}`, 'Casework', err);
  }

  try {
    await submitAudit('resolver', { success: false });
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

          await submitAudit('resolver', { success: true, caseID });
          return resolve();
        }

        logger.info({ externalID, message: `Case already submitted with iCasework Case ID ${caseID}` });

        await submitAudit('duplicates', { caseID, externalID });
        await submitAudit('resolver', { success: true, caseID });
        return resolve();
      } catch (e) {
        return handleError(caseID, externalID, reject, e);
      }

      return getCase.fetch()
        .then(getCaseResponse => {
          caseID = getCaseResponse.caseId;

          if (!getCaseResponse.exists) {
            return submitCase.save()
              .then(data => {
                caseID = data.createcaseresponse.caseid;

                logger.info({ caseID, message: 'Casework submission successful' });

                return submitAudit('resolver', { success: true, caseID }).then(resolve);
              })
              .catch(e => handleError(caseID, externalID, reject, e));
          }

          logger.info({ externalID, message: `Case already submitted with iCasework Case ID ${caseID}` });

          return submitAudit('duplicates', { caseID, externalID })
            .then(() => submitAudit('resolver', { success: true, caseID }))
            .then(resolve);
        })
        .catch(e => handleError(caseID, externalID, reject, e));
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
