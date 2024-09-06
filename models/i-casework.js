'use strict';

const { model: Model } = require('hof');
const crypto = require('crypto');
const config = require('../config');
const logger = require('hof/lib/logger')({ env: config.env });

module.exports = class CaseworkModel extends Model {
  // constructor(attributes, options) {
  //   super(attributes, options);
  //   this.options.timeout = this.options.timeout || config.icasework.timeout;
  // }

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

  // async save() {
  //   try {
  //     const data = await this.prepare();
  //     const params = {
  //       url: this.url(),
  //       data,
  //       timeout: config.icasework.timeout,
  //       method: 'POST'
  //     };
  //     const response = await this._request(params);
  //     console.log('******************* THIS IS THE RESPONSE: ', response);
  //     return response;
  //   } catch (error) {
  //     console.error('Error saving data:', error);
  //     throw error;
  //   }
  // }

   // async save() {
  //   try {
  //     const data = await this.prepare();
  //     const params = {
  //       url: this.url(),
  //       data,
  //       timeout: config.icasework.timeout,
  //       method: 'POST'
  //     };
  //     const response = await this._request(params);
  //     return response;
  //   } catch (error) {
  //     console.error('Error saving data:', error);
  //     throw error;
  //   }
  // }

  async save() {
    try {
      return Promise.resolve(this.prepare()).then(async data => {
        const params = {
          url: this.url(),
          data,
          timeout: config.icasework.timeout,
          method: 'POST'
        };
        const response = await this._request(params);
        console.log('This is the response ', response);
        console.log('This is the handled response ', this.handleResponse(response));
        return response;
      });
    } catch (err) {
      logger.error(`Error saving data: ${err.message}`);
      throw new Error(`Failed to save data: ${err.message || 'Unknown error'}`);
    }
  }
};
