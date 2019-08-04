const {ErrorReporting} = require('@google-cloud/error-reporting');
const gcloud_errors = new ErrorReporting({
  keyFilename: __dirname + '/../../../google_cloud_key.json',
  reportMode: 'always',
  projectId: 'logs-247119',
});

const Sentry = require('@sentry/node');
Sentry.init({ dsn: process.env.SENTRY_DSN });

var AWSXRay = require('aws-xray-sdk');
AWSXRay.setDaemonAddress(process.env.AWS_XRAY_DAEMON_HOST + ':' + process.env.AWS_XRAY_DAEMON_PORT);

// Sentry
// The request handler must be the first middleware on the app
app.use(Sentry.Handlers.requestHandler());
// The error handler must be before any other error middleware
app.use(Sentry.Handlers.errorHandler());
