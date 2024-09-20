'use strict';

const Model = require('hof').model;
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
    const options = this.requestConfig({});
    options.url = this.url();
    options.data = this.prepare();
    options.method = 'POST';
    console.log('****************** Saving function ');
    console.log('****************** testing request ', this._request(options), '*************************');
    console.log('****************** testing other request ', this.request(options), '*************************');
    return Promise.resolve(this.prepare()).then(data => {
      const params = {
        url: this.url(),
        data,
        timeout: config.icasework.timeout,
        method: 'POST'
      };
      const response = this.request(params);
      console.log('*************  response ', response);
      return this.parse(response);
    });
    // return this.request(options);
  }
};
