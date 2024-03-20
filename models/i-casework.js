'use strict';

const crypto = require('crypto');
const axios = require('axios');
const config = require('../config');

module.exports = class CaseworkModel {
  prepare() {
    const date = (new Date()).toISOString().split('T')[0];
    const params = {
      Key: config.icasework.key,
      Signature: crypto.createHash('md5').update(date + config.icasework.secret).digest('hex'),
      Type: config.icasework.type,
      Format: 'json',
      db: config.icasework.db,
      RequestMethod: 'Online form'
    };

    return Object.assign(params, this.toJSON());
  }
  async save() {
    const data = await Promise.resolve(this.prepare());
    const url = `${config.icasework.url}${config.icasework.createpath}?db=${config.icasework.db}`;
    const response = await axios.post(url, data, { timeout: config.icasework.timeout });
    return await response;
  }
};
