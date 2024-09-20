'use strict';

const { model: Model } = require('hof');
const crypto = require('crypto');
const config = require('../config');
const logger = require('hof/lib/logger')({ env: config.env });

module.exports = class DocumentModel extends Model {
  constructor(attributes, options) {
    super(attributes, options);
    this.options.timeout = this.options.timeout || config.icasework.fetchTimeout;
  }

  url() {
    // we are just building up the url with the path
    return `${config.icasework.url}${config.icasework.getcasepath}`;
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
      const adjustedResponse = `[${response.body.replace(/\n/g, '').replace(/\r/g, '').replace(/}{/g, '},{')}]`;

      const latestEntry = JSON.parse(adjustedResponse).reverse()[0];
      caseId = latestEntry['CaseDetails.CaseId'];
    } finally {
      return callback(null, { caseId, exists: response.statusCode === 200 });
    }
  }

  async fetch() {
    const params = this.requestConfig({});
    params.qs = this.prepare();
    params.method = 'GET';
    try {
      return await this.request(params);
    } catch (err) {
      logger.error(`Error fetching data from ${this.url()}: ${err.message}`);
      throw new Error(`Failed to fetch data: ${err.message || 'Unknown error'}`);
    }
  }
};
