'use strict';

const Model = require('hof').model;
const crypto = require('crypto');
const config = require('../config');

module.exports = class DocumentModel extends Model {
  constructor(attributes, options) {
    super(attributes, options);
    this.options.timeout = this.options.timeout || config.icasework.fetchTimeout;
  }

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

  handleResponse(response, callback) {
    let caseId = 'N/A';

    try {
      // if duplicate entries preexist, iCW responds with line by line objects in JSON string format.
      // This wraps them into an array before JSON parsing to prevent a parsing fail.
      const adjustedResponse = `[${response.data.replace(/\n/g, '').replace(/\r/g, '').replace(/}{/g, '},{')}]`;
      const latestEntry = JSON.parse(adjustedResponse).reverse()[0];
      caseId = latestEntry['CaseDetails.CaseId'];
    } finally {
      return callback(null, { caseId, exists: response.status === 200 });
    }
  }

  fetch() {
    const params = {
      url: this.url(),
      method: 'GET',
      params: this.prepare()
    };
    return this._request(params).then(response => {
      return this.handleResponse(response.data);
    })
      .catch(err => {
        return err;
      });
  }
};
