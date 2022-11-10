# iCasework Resolver

This app will resolve any messages on a AWS SQS queue to be submitted to iCasework via its RESTful interface

## iCasework Docs
API docs for iCasework can be found here https://icasework.atlassian.net/wiki/spaces/UsefulFeedback/overview?homepageId=15171588

In the resolver we use the following APIs:
- CreateCase - This is used to create a new case in iCasework when the resolver picks up a new payload from the SQS queue and processes it - https://icasework.atlassian.net/wiki/spaces/UsefulFeedback/pages/15171615/CreateCase+API
- GetCaseDetails - To fetch a case using the ExternalId we provide when POSTing a case to iCasework. This is to check with preexisting cases to avoid duplicating them - https://icasework.atlassian.net/wiki/spaces/UsefulFeedback/pages/70784651/GetCaseDetails+API

### KnexFile
It is important to note that when upgrading `knex` it needs to be aware of the database adapter version it needs to use. For this service we use postgres through the `pg` package. The version specified in the package.json file then also needs to be included in the db knexfile, i.e. `db/knexfile.js`, which you will be able to see under `version`. Whenever `pg` is updated, this needs to be updated too otherwise the knex tool will fail trying to reach a remote DB like RDS. A standard error in this scenario looks like the following, including for any other scenarios the configuration is wrong when using knex to connect to a DB:
```
Knex: Timeout acquiring a connection. The pool is probably full. Are you missing a .transacting(trx) call?
```

### Auditing

The resolver will additionally connect to a postgres db and write audit data to a `resolver` table with specified credentials.

By default auditing is disabled but can be enabled by setting `AUDIT_DATA` to true.

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
AUDIT_DATA            | Enable audit data (true). Defaults to false.
DB_HOST               | The postgres db host for audit data
DB_USER               | The postgres db username for audit data
DB_PASS               | The postgres db password for audit data
DB_NAME               | The postgres db name for audit data
```
