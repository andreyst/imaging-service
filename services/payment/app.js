const serviceShortName = 'Payment'
const serviceName = serviceShortName + 'Service'

const ddTracer = require('dd-trace').init({
  enabled: true,
  service: serviceName,
  hostname: process.env['DD_AGENT_TRACE_HOST'],
  port: process.env['DD_AGENT_TRACE_PORT'],
  analytics: true,
})

const app = require('express')()
const request = require('request')
const uuid = require('uuid')
const winston = require('winston')
const DatadogTransport = require('@shelf/winston-datadog-logs-transport');
const opentracing = require('opentracing')
const axios = require('axios');

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
  logger.add(new DatadogTransport({
    apiKey: process.env.DD_API_KEY, // Datadog API key
    // optional metadata which will be merged with every log message
    metadata: {
      ddsource: serviceName,
      environment: 'prod'
    }
  }))
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
// const tracer = ddTracer

const host = process.env['PAYMENT_SERVICE_HOST'] || '0.0.0.0'
const port = process.env['PAYMENT_SERVICE_PORT'] || 8004

app.listen(port, host, () => logger.info(`${serviceShortName} service listening on ${host}:${port}!`))

function get_access_service_endpoint() {
  return 'http://' + process.env['ACCESS_SERVICE_HOST'] + ':' + process.env['ACCESS_SERVICE_PORT']
}

async function authorize(span, headers) {
  const url = get_access_service_endpoint() + '/authorize'
  const response = await axios.get(url, { headers });
  const data = response.data;

  logger.info('Authorization request', response.data.success, 'authorized', response.data.authorized);
  span.log({'event': 'authorized'});
}

async function authenticate(span, headers) {
  const url = get_access_service_endpoint() + '/authenticate'
  const response = await axios.get(url, { headers });
  const data = response.data;

  span.log({'event': 'authenticated'});
  logger.info('Authentication request', response.data.success, 'authenticated', response.data.authenticated);
}

app.get('/', (req, res) => {
  return res.send({serviceName})
})

app.get('/pay', async (req, res) => {
  const parentSpanContext = tracer.extract(opentracing.FORMAT_HTTP_HEADERS, req.headers)
  const span = tracer.startSpan('pay', {
    childOf: parentSpanContext
  })

  const headers = {}
  tracer.inject(span, opentracing.FORMAT_HTTP_HEADERS, headers)

  try {
    await authenticate(span, headers)
    await authorize(span, headers)
  } catch (err) {
    span.setTag(opentracing.Tags.ERROR, true);
    logger.error(err.stack)
    span.log({'event': 'error', 'error.object': err, 'message': err.message, 'stack': err.stack});
    span.finish();

    return res.send({ success: false, traceId: span.context().traceIdStr });
  }

  await new Promise(done => setTimeout(done, Math.floor(Math.random() * 100)));

  logger.info('Paid in trace', span.context().traceIdStr, 'span', span.context().spanIdStr)

  res.send({ success: true, trace_id: span.context().traceIdStr })
  span.log({'event': 'paid'});

  span.finish()
})

