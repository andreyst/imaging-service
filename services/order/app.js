const app = require('express')()
const request = require('request');
const uuid = require('uuid');
const winston = require('winston')
const opentracing = require('opentracing')

const serviceShortName = 'Order'
const serviceName = serviceShortName + 'Service'

const logger = winston.createLogger({
  level: 'debug',
  format: winston.format.json(),
  defaultMeta: { service: serviceShortName },
  // transports: [
    //
    // - Write to all logs with level `info` and below to `combined.log`
    // - Write all logs error (and below) to `error.log`.
    //
    // new winston.transports.File({ filename: 'error.log', level: 'error' }),
    // new winston.transports.File({ filename: 'combined.log' })
  // ]
});

//
// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
//
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

var initTracer = require('jaeger-client').initTracer;

// See schema https://github.com/jaegertracing/jaeger-client-node/blob/master/src/configuration.js#L37
var config = {
  serviceName: serviceName,
  reporter: {
    logSpans: true,
    agentHost: process.env['JAEGER_HOST'],
    agentPort: process.env['JAEGER_PORT']
  },
  sampler: {
    type: "probabilistic",
    param: 1.0
  }
};

let jaeger_tags = {}
jaeger_tags[`${serviceName}.version`] = "0.0.1"

var options = {
  tags: jaeger_tags,
  // metrics: metrics,
  logger: logger,
};
var tracer = initTracer(config, options);

const host = process.env['ORDER_SERVICE_HOST'] || '0.0.0.0'
const port = process.env['ORDER_SERVICE_PORT'] || 8001

app.listen(port, host, () => console.log(`${serviceShortName} service listening on ${host}:${port}!`))

app.get('/', (req, res) => {
  return res.send({serviceName})
})

app.get('/order', (req, res) => {
  const span = tracer.startSpan('order');
  console.log('Received an order request!')

  access_service_endpoint = 'http://' + process.env['ACCESS_SERVICE_HOST'] + ':' + process.env['ACCESS_SERVICE_PORT']

  url = access_service_endpoint + '/authenticate'

  const headers = {}
  tracer.inject(span, opentracing.FORMAT_HTTP_HEADERS, headers)

  request({ url, headers, json: true }, (err, res2, body) => {
    if (err) {
      span.setTag(opentracing.Tags.ERROR, true);
      span.log({'event': 'error', 'error.object': err, 'message': err.message, 'stack': err.stack});
      span.finish();

      res.send({ success: false, error: err });
      return;
    }
    span.log({'event': 'authenticated'});
    console.log('Authentication request', body.result, 'authenticated', body.authenticated);

    url = access_service_endpoint + '/authorize'
    request({ url, headers, json: true }, (err, res3, body) => {
      if (err) {
        span.setTag(opentracing.Tags.ERROR, true);
        span.log({'event': 'error', 'error.object': err, 'message': err.message, 'stack': err.stack});
        span.finish();

        res.send({ success: false, error: err });
        return
      }

      console.log('Authorization request', body.result, 'authorized', body.authorized);
      span.log({'event': 'authorized'});

      let order_id = uuid.v4()
      console.log('Made order', order_id, 'in trace', span.context().traceIdStr, 'span', span.context().spanIdStr)

      res.send({ success: true, order_id, trace_id: span.context().traceIdStr })
      span.log({'event': 'order_made'});

      span.finish()
    });
  });
})

