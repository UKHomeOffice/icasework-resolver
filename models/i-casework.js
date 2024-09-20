'use strict';

const { model: Model } = require('hof');
const crypto = require('crypto');

const config = require('../config');

module.exports = class CaseworkModel extends Model {
  constructor(attributes, options) {
    super(attributes, options);
    this.options.timeout = this.options.timeout || config.icasework.timeout;
  }

  url() {
    return `${config.icasework.url}${config.icasework.createpath}?db=${encodeURIComponent(config.icasework.db)}`;
  }

  prepare() {
    const params = {
      Key: config.icasework.key,
      Signature: this.sign(),
      Type: config.icasework.type,
      Format: 'json',
      db: config.icasework.db,
      RequestMethod: 'Online form'
    };

    return Object.assign(params, this.toJSON());
  }

  sign() {
    const date = (new Date()).toISOString().split('T')[0];
    return crypto.createHash('md5').update(date + config.icasework.secret).digest('hex');
  }

  save() {
    // const options = this.requestConfig({});
    // options.url = this.url();
    // options.data = this.prepare();
    // options.method = 'POST';
    try {
      return Promise.resolve(this.prepare()).then(data => {
        const params = {
          url: this.url(),
          data,
          timeout: config.icasework.timeout,
          method: 'POST'
        };
        const response = this.request(params);
        return this.parse(response);
      });
    } catch (err) {
      logger.error(`Error saving data: ${err.message}`);
      throw new Error(`Failed to save data: ${err.message || 'Unknown error'}`);
    }
  }
};
