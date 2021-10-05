'use strict';

const Model = require('hof-model');
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

  prepare(data) {
    const params = {
      Key: config.icasework.key,
      Signature: this.sign(),
      CaseId = data.ExternalId,
      Format: 'json',
      db: config.icasework.db,
      RequestMethod: 'Online form'
    };

    return Object.assign(params, this.toJSON());
  }

  fetch() {
    const options = this.requestConfig({});
    options.form = this.prepare();
    options.method = 'GET';

    return this.request(options);
  }
};