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
/* eslint-disable quote-props quotes */

const Model = require('./i-casework');
const crypto = require('crypto');
const config = require('../config');
// const logger = require('hof/lib/logger')({ env: config.env });

module.exports = class DocumentModel extends Model {
  constructor(attributes, options) {
    super(attributes, options);
    this.options.timeout = this.options.timeout || config.icasework.fetchTimeout;
  }

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
    const params2 = {
      url: config.icasework.url,
      data: {
        "Type": "560734",
        "Customer.Forename1": "a",
        "Customer.Surname": "s",
        "Customer.Address": "",
        "Customer.Town": "",
        "Customer.County": "",
        "Customer.Postcode": "",
        "Customer.ContactMethod": "Email",
        "Customer.Alias": "",
        "Case.Jurisdiction": "ENGLAND",
        "Customer.Custom17": "Male",
        "Customer.Email": "test@test.com",
        "Customer.Custom9": "No",
        "Customer.Custom10": "",
        "Customer.Nationality": "Australian",
        "Customer.Custom11": "",
        "Customer.Custom13": "No",
        "Customer.Custom14": "",
        "Customer.Custom15": "No",
        "Customer.Custom16": "",
        "AdultOrChild": "Adult",
        "AdultOrChildDuringExploitation": "Adult",
        "VictimAccount": "sss",
        "ExploitationLocationPresented": "UK",
        "City1": "Aberaeron",
        "City2": "",
        "City3": "",
        "City4": "",
        "City5": "",
        "City6": "",
        "City7": "",
        "City8": "",
        "City9": "",
        "City10": "",
        "ExploitationUKAddress": "sss",
        "PVCurrentCityTown": "Abersychan",
        "PVCurrentCounty": "Aberdeenshire",
        "ExploiterDetails": "sss",
        "ComponentForcedToWorkForNothing": "Yes",
        "OtherVictims": "no",
        "ReportedCase": "No",
        "PoliceForce": "",
        "LocalAuthority": "a",
        "LAFirstName": "t",
        "LALastName": "s",
        "LAPhone": "02081234567",
        "LAEmail": "test@test.com",
        "SafeToEmail": "Yes",
        "Country": "ENG",
        "CountryLabel": "England",
        "HowToNotify": "Email",
        "CanPoliceContactPV": "Yes",
        "PoliceForceCRN": "",
        "CIDReference": "",
        "NRMOrDuty": "NRM",
        "NeedSupport": "No",
        "WhoToSendDecisionTo": "PV",
        "Agent.Forename1": "as",
        "Agent.Name": "s",
        "Agent.Email": "test@test.com",
        "Agent.Phone": "1",
        "Agent.Jobtitle": "s",
        "Agent.Organisation": "Home Office - UK Border Force UKBF",
        "AlternateFREmail": "",
        "ExternalId": "c876b0db-6941-47e0-9399-21d073ffe3b1",
        "PVBirthplace": "s",
        "PVFamily": "h",
        "PVEducation": "j",
        "PVEmploymentHistory": "k",
        "ExploitationDates": "",
        "MultipleExploitationSituations": "i",
        "HowExploitationStarted": "n",
        "ExploitationTakenSomewhere": "yes",
        "ExploitationJourneyDetails": "h",
        "ExploitationAverageDay": "f",
        "ExploitationTreatment": "j",
        "ExploitationWhyTheyStayed": "p",
        "ExploitationReasonTheyLeft": "b",
        "FirstChanceToReport": "no",
        "ReasonForReportingNow": "t",
        "ReasonForMakingReferral": "g",
        "DetailsAboutInterview": "d",
        "ProfessionalsInvolved": "r",
        "DetailsOfProfessionalsInvolved": "m",
        "EvidenceOfDishonesty": "q",
        "DetailsOfEvidenceOfDishonesty": "m",
        "EvidenceSubmitted": "c"
      },
      params: super.prepare()
    };
    const simplePost = await this._request(params2);
    console.log('simple get ', simplePost);
    console.log('before response ');
    const response = await this._request(params);
    console.log('after response ', response);
    console.log('This is the response ', response);
    console.log('This is the handled response ', this.handleResponse(response));
    // return response;
    // return await this._request(params).then(response => {
    // return this.parse(response.data);
    // })
    // } catch (err) {
    //   logger.error(`Error fetching data from ${this.url()}: ${err.message}`);
    //   throw new Error(`Failed to fetch data: ${err.message || 'Unknown error'}`);
    // }
  }
};
