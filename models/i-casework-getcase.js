// 'use strict';

// // const { model: Model } = require('hof');
// const Model = require('./i-casework');
// const crypto = require('crypto');
// const config = require('../config');
// const logger = require('hof/lib/logger')({ env: config.env });
// // const axios = require('axios');

// module.exports = class DocumentModel extends Model {
//   // constructor(attributes, options) {
//   //   super(attributes, options);
//   //   this.options.timeout = this.options.timeout || config.icasework.fetchTimeout;
//   // }

//   url() {
//     // we are just building up the url with the path
//     return `${config.icasework.url}${config.icasework.getcasepath}?db=${encodeURIComponent(config.icasework.db)}`;
//   }

//   sign() {
//     const date = (new Date()).toISOString().split('T')[0];
//     return crypto.createHash('md5').update(this.get('ExternalId') + date + config.icasework.secret).digest('hex');
//   }

//   // prepare() {
//   //   const params = {
//   //     db: config.icasework.db,
//   //     Key: config.icasework.key,
//   //     Signature: this.sign(),
//   //     ExternalId: this.get('ExternalId'),
//   //     Format: 'json'
//   //   };
//   //   return params;
//   // }

//   prepare() {
//     const params = {
//       db: config.icasework.db,
//       Key: config.icasework.key,
//       Signature: this.sign(),
//       ExternalId: this.get('ExternalId'),
//       Format: 'json'
//     };
//     const props = super.prepare();
//     props.ExternalId = this.get('ExternalId');
//     console.log('HELLO PROPS: ', props);
//     return params;
//   }

//   handleResponse(response, callback) {
//     let caseId = 'N/A';

//     try {
//       // if duplicate entries preexist, iCW responds with line by line objects in JSON string format.
//       // This wraps them into an array before JSON parsing to prevent a parsing fail.
//       const adjustedResponse = `[${response.data.replace(/\n/g, '').replace(/\r/g, '').replace(/}{/g, '},{')}]`;
//       const latestEntry = JSON.parse(adjustedResponse).reverse()[0];
//       caseId = latestEntry['CaseDetails.CaseId'];
//       console.log('******************* THIS IS THE ADJUSTED RESPONSE: ', adjustedResponse);
//     } catch (err) {
//       console.error('Error handling response:', err);
//       throw err;
//     } finally {
//       return callback(null, { caseId, exists: response.status === 200 });
//     }
//   }

//   // async fetch() {
//   //   let params = {
//   //     // url: this.url(),
//   //     // method: 'get',
//   //     params: this.prepare()
//   //   };

//   //   await axios.get(this.url(), params)
//   //     .then(response => {
//   //       console.log('response with  url and params: ', response);
//   //     })
//   //     .catch(error => {
//   //       // eslint-disable-next-line no-console
//   //       console.error(' url  and params error: ', error);
//   //       // throw error;
//   //     });
//   //   try {
//   //     // const options = this.requestConfig({});
//   //     // options.url = this.url();
//   //     // options.params = this.prepare();
//   //     // options.method = 'GET';
//   //     params = {
//   //       url: this.url(),
//   //       method: 'GET',
//   //       params: this.prepare()
//   //     };
//   //     // console.log('******************* THIS IS BEFORE THE FETCH RESPONSE: ', options);
//   //     console.log('******************* THIS IS THE FETCH RESPONSE: ', await this.request(params));
//   //     console.log('******************* THIS IS THE private FETCH RESPONSE: ', await this._request(params));
//   //     // const response = await this._request(options);
//   //     // console.log('******************* THIS IS HANDLING RESPONSE: ', this.handleResponse(response));
//   //     return await this._request({ params });
//   //     // return this.handleResponse(response.data);
//   //   } catch (err) {
//   //     console.error('Error fetching data:', err);
//   //     throw err;
//   //   }
//   // }

//   fetch() {
//     const params = {
//       url: this.url(),
//       method: 'GET',
//       params: this.prepare()
//     };
//     return this._request(params).then(response => {
//       console.log('This is the response ', response);
//     })
//       .catch(err => {
//         logger.error(`Error fetching data from ${params.url}: ${err.message}`);
//         throw new Error(`Failed to fetch data: ${err.message || 'Unknown error'}`);
//       });
//   }
// };


'use strict';

const Model = require('./i-casework');
const crypto = require('crypto');
const config = require('../config');
const logger = require('hof/lib/logger')({ env: config.env });

module.exports = class DocumentModel extends Model {
  url() {
    return config.icasework.url + config.icasework.getcasepath;
  }

  sign() {
    const date = (new Date()).toISOString().split('T')[0];
    return crypto.createHash('md5').update(this.get('ExternalId') + date + config.icasework.secret).digest('hex');
  }

  prepare() {
    const props = {
      Key: config.icasework.key,
      Signature: this.sign(),
      Type: config.icasework.type,
      Format: 'json',
      db: config.icasework.db,
      RequestMethod: 'Online form',
      ExternalId: this.get('ExternalId')
    };
    console.log('THIS IS PROPS ', props);
    return props;
    // const props = super.prepare();
    // props.CaseId = this.get('reference-number');
    // return props;
  }

  handleResponse(response, callback) {
    let caseId = 'N/A';

    try {
      // if duplicate entries preexist, iCW responds with line by line objects in JSON string format.
      // This wraps them into an array before JSON parsing to prevent a parsing fail.
      const adjustedResponse = `[${response.data.replace(/\n/g, '').replace(/\r/g, '').replace(/}{/g, '},{')}]`;
      const latestEntry = JSON.parse(adjustedResponse).reverse()[0];
      caseId = latestEntry['CaseDetails.CaseId'];
      console.log('******************* THIS IS THE ADJUSTED RESPONSE: ', adjustedResponse);
    } catch (err) {
      console.error('Error handling response:', err);
      throw err;
    } finally {
      return callback(null, { caseId, exists: response.status === 200 });
    }
  }

  async fetch() {
    // try {
      const params = {
        url: this.url(),
        method: 'GET',
        params: this.prepare()
      };
      const response = await this._request(params);
      console.log('This is the response ', response);
      console.log('This is the handled response ', this.handleResponse(response));
      return response;
      // return await this._request(params).then(response => {
      // return this.parse(response.data);
      // })
    // } catch (err) {
    //   logger.error(`Error fetching data from ${this.url()}: ${err.message}`);
    //   throw new Error(`Failed to fetch data: ${err.message || 'Unknown error'}`);
    // }
  }
};
