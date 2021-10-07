'use strict';

const Model = require('hof').model;
const crypto = require('crypto');

const config = require('../config');

module.exports = class DocumentModel extends Model {
  url() {
    // we are just building up the url with the path
    return config.icasework.url + config.icasework.getcasepath;
  }

  sign() {
    const date = (new Date()).toISOString().split('T')[0];
    return crypto.createHash('md5').update(this.get('ExternalId') + date + config.icasework.secret).digest('hex');
  }

  prepare() {
    const params = {
      Key: config.icasework.key,
      Signature: this.sign(),
      ExternalId: this.get('ExternalId'),
      Format: 'json',
      db: config.icasework.db
    };
    return params;
  }

  // Try block is to get caseID. This is for logging purposes only. iCW can be spurious with its response body
  // So, finally block ensures resolver continues uninterrupted in the event of a parsing fail
  handleResponse(response, callback) {
    let caseId = 'N/A';

    try {
      const adjustedResponse = `[${response.body.replace(/\n/g, '').replace(/\r/g, '').replace(/}{/g, '},{')}]`;
      const latestEntry = JSON.parse(adjustedResponse).reverse()[0];
      caseId = latestEntry['CaseDetails.CaseId'];
    } finally {
      return callback(null, { caseId, exists: response.statusCode === 200 });
    }
  }

  fetch() {
    const options = this.requestConfig({});
    options.qs = this.prepare();
    options.method = 'GET';

    return this.request(options);
  }
};
