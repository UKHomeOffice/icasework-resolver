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

  handleResponse(response, callback) {
    const adjustedReponse = response;
    adjustedReponse.body = `[${adjustedReponse.body.replace(/\n/g, '').replace(/\r/g, '').replace(/}{/g, '},{')}]`;
    return super.handleResponse(adjustedReponse, callback);
  }

  fetch() {
    const options = this.requestConfig({});
    options.qs = this.prepare();
    options.method = 'GET';

    return this.request(options);
  }
};
