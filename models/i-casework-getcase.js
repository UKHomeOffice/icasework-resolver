'use strict';

// const Model = require('hof').model;
const crypto = require('crypto');
const config = require('../config');
const axios = require('axios');

module.exports = class DocumentModel {
  constructor(attributes, options) {
    super(attributes, options);
    this.options.timeout = this.options.timeout || config.icasework.fetchTimeout;
  }

  // url() {
  //   // we are just building up the url with the path
  //   return config.icasework.url + config.icasework.getcasepath;
  // }

  // sign() {
  // const date = (new Date()).toISOString().split('T')[0];
  // return crypto.createHash('md5').update(this.get('ExternalId') + date + config.icasework.secret).digest('hex');
  // }

  prepare() {
    const date = (new Date()).toISOString().split('T')[0];
    const params = {
      Key: config.icasework.key,
      Signature: crypto.createHash('md5').update(this.get('ExternalId') + date + config.icasework.secret).digest('hex'),
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
      const adjustedResponse2 = `[${response.data.replace(/\n/g, '').replace(/\r/g, '').replace(/}{/g, '},{')}]`;
      console.log('**************adjustedResponse ', adjustedResponse);
      console.log('*************adjustedResponse2 ', adjustedResponse2);
      const latestEntry = JSON.parse(adjustedResponse).reverse()[0];
      caseId = latestEntry['CaseDetails.CaseId'];
      console.log(caseId);
    } finally {
      return callback(null, { caseId, exists: response.status === 200 });
    }
  }


  // fetch() {
  //   const options = this.requestConfig({});
  //   options.qs = this.prepare();
  //   options.method = 'GET';

  //   return this.request(options);
  // }

  fetch() {
    return axios.get(`${config.icasework.url}${config.icasework.getcasepath}`, {
      params: this.prepare()
    }).then(response => {
      console.log('*****************Response ', response);
      return this.handleResponse(response.data);
    })
      .catch(err => {
        return err;
      });
  }
};
