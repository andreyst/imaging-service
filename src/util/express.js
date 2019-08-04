const app = require('express')()
const logger = require('./logging.js').logger
const opentracing = require('opentracing')

module.exports.init = function() {
  app.get('/', (req, res) => {
    return res.send({serviceName: process.env.SERVICE_NAME + 'Service'})
  })

  return app
}

module.exports.listen = function(app, port, host) {
  host = host || '0.0.0.0'
  app.listen(port, host, () => logger.info({ message: 'App listening', service: process.env.SERVICE_NAME, host, port }))
}

module.exports.handleClientError = function(span, err, res) {
  span.setTag(opentracing.Tags.ERROR, true);
  logger.error({message: serviceShortName + ' request error', 'stack': err.stack})

  // Sentry.configureScope((scope) => {
  //   scope.setUser({"id": userId});
  //   Sentry.captureMessage(err.message)
  // });

  span.log({'event': 'error', 'error.object': err, 'message': err.message, 'stack': err.stack});
  span.finish();
  // gcloud_errors.report({'event': 'error', 'error.object': err, 'message': err.message, 'stack': err.stack});

  return res.send({ success: false, traceIds: span.getTraceIds() });
}