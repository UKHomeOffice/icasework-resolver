'use strict';

// bail early if iCaswork envs are not set
if (!process.env.ICASEWORK_URL) {
  throw new Error('ICASEWORK_URL must be defined');
}

if (!process.env.ICASEWORK_KEY) {
  throw new Error('ICASEWORK_KEY must be defined');
}

if (!process.env.ICASEWORK_SECRET) {
  throw new Error('ICASEWORK_SECRET must be defined');
}

if (!process.env.ICASEWORK_DB) {
  throw new Error('ICASEWORK_DB must be defined');
}

// bail early if AWS envs are not set
if (!process.env.AWS_SQS) {
  throw new Error('AWS_SQS must be defined');
}

if (!process.env.AWS_SECRET_ACCESS_KEY) {
  throw new Error('AWS_SECRET_ACCESS_KEY must be defined');
}

if (!process.env.AWS_ACCESS_KEY_ID) {
  throw new Error('AWS_ACCESS_KEY_ID must be defined');
}

module.exports = {
  icasework: {
    url: process.env.ICASEWORK_URL,
    createpath: '/createcase',
    uploadpath: '/uploaddocuments',
    getcasepath: '/getcasedetails',
    key: process.env.ICASEWORK_KEY,
    secret: process.env.ICASEWORK_SECRET,
    type: process.env.ICASEWORK_FORM_TYPE || '',
    db: process.env.ICASEWORK_DB,
    timeout: process.env.ICASEWORK_TIMEOUT || 20000
  },
  aws: {
    sqs: process.env.AWS_SQS
  }
};
