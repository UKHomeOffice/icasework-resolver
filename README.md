# iCasework Resolver

This app will resolve any messages on a AWS SQS queue to be submitted to iCasework via its RESTful interface.

### Environment variables

You'll need to set the following env vars:

```
ICASEWORK_FORM_TYPE   | iCasework form type
ICASEWORK_DB          | iCasework DB name
ICASEWORK_KEY         | Key for the iCasework API
ICASEWORK_SECRET      | Secret for the API key
ICASEWORK_URL         | iCasework URL for the casework instance
AWS_SQS               | AWS SQS URL
AWS_SECRET_ACCESS_KEY | AWS Secret Access Key
AWS_ACCESS_KEY_ID     | AWS Access Key ID
```
