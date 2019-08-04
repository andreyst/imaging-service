const serviceShortName = 'Access'
const serviceName = serviceShortName + 'Service'

const ddTracer = require('dd-trace').init({
  enabled: true,
  service: serviceName,
  hostname: process.env['DD_AGENT_TRACE_HOST'],
  port: process.env['DD_AGENT_TRACE_PORT'],
  analytics: true,
})

const app = require('express')()
const winston = require('winston')
const DatadogTransport = require('@shelf/winston-datadog-logs-transport');
const opentracing = require('opentracing')

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

const host = process.env['ACCESS_SERVICE_HOST'] || '0.0.0.0'
const port = process.env['ACCESS_SERVICE_PORT'] || 8002

app.listen(port, host, () => logger.info(`${serviceShortName} service listening on ${host}:${port}!`))

app.get('/', (req, res) => {
  return res.send({serviceName})
})

app.get('/authenticate', async (req, res) => {
  logger.info('Received an authenticate request')

  const parentSpanContext = tracer.extract(opentracing.FORMAT_HTTP_HEADERS, req.headers)
  const span = tracer.startSpan('authenticate', {
    childOf: parentSpanContext
  })

  await new Promise(done => setTimeout(done, Math.floor(Math.random() * 250)));

  span.log({'event': 'authenticated'})
  span.finish()

  if (Math.random() < 0.1) {
    return res.status(500).send('HTTP 500 Server Error')
  }

  return res.send({ success: true, authenticated: true })
})

// TODO: Allow authentication in authorize request
app.get('/authorize', async (req, res) => {
  logger.info('Received an authorize request')

  const parentSpanContext = tracer.extract(opentracing.FORMAT_HTTP_HEADERS, req.headers)
  const span = tracer.startSpan('authorize', {
    childOf: parentSpanContext
  })

  await new Promise(done => setTimeout(done, Math.floor(Math.random() * 100)));

  span.log({'event': 'authorized'})
  span.finish()

  return res.send({ success: true, authorized: true })
})



