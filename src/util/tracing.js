const ddTrace = require('dd-trace')
const jaegerClient = require('jaeger-client')
const opentracing = require('opentracing')

var ddTracer, jaegerTracer;

// This should be called before including any other instrumented module
function initDdTracer() {
  ddTracer = ddTrace.init({
    enabled: true,
    service: process.env.SERVICE_NAME,
    hostname: process.env.DD_AGENT_TRACE_HOST,
    port: process.env.DD_AGENT_TRACE_PORT,
    analytics: true,
    logInjection: true,
  })
}

function initJaegerTracer(logger) {
  var jaegerInitTracer = jaegerClient.initTracer;

  // See schema https://github.com/jaegertracing/jaeger-client-node/blob/master/src/configuration.js#L37
  var jaegerConfig = {
    serviceName: process.env.SERVICE_NAME + 'Service',
    reporter: {
      logSpans: true,
      agentHost: process.env.JAEGER_HOST,
      agentPort: process.env.JAEGER_POR,
    },
    sampler: {
      type: "probabilistic",
      param: 1.0
    }
  };

  let jaegerTags = {}
  jaegerTags[process.env.SERVICE_NAME + 'Service.version'] = "0.0.1"

  const jaegerOptions = {
    tags: jaegerTags,
    // metrics: metrics,
    logger: logger,
  };

  // Jaeger tracer
  jaegerTracer = jaegerInitTracer(jaegerConfig, jaegerOptions);
}

module.exports.init = function() {
  initDdTracer()
  return module.exports
}

module.exports.initWithLogger = function(logger) {
  initJaegerTracer(logger)

  // Datadog tracer
  // const tracer = ddTracer

  // Google tracer
  // const tracer = require('@google-cloud/trace-agent').start({
  //   keyFilename: __dirname + '/../../../google_cloud_key.json',
  //   projectId: 'logs-247119',
  // });
  return module.exports
}

class Span {
  constructor (ddSpan, jaegerSpan) {
    this.ddSpan = ddSpan
    this.jaegerSpan = jaegerSpan
  }

  injectHeaders(headers) {
    ddTracer.inject(this.ddSpan, opentracing.FORMAT_HTTP_HEADERS, headers)
    jaegerTracer.inject(this.jaegerSpan, opentracing.FORMAT_HTTP_HEADERS, headers)
  }

  setTag(key, value) {
    this.ddSpan.setTag(key, value)
    this.jaegerSpan.setTag(key, value)
  }

  log(message) {
    this.ddSpan.log(message)
    this.jaegerSpan.log(message)
  }

  finish() {
    this.ddSpan.finish()
    this.jaegerSpan.finish()
  }

  getTraceIds() {
    return {
      ddTraceId: this.ddSpan.context().toTraceId(),
      jaegerTraceId: this.jaegerSpan.context().traceIdStr,
    }
  }
}

module.exports.startSpan = function(name, headersIn) {
  const headersOut = {}

  const ddParentSpanContext = ddTracer.extract(opentracing.FORMAT_HTTP_HEADERS, headersIn)
  const ddSpan = ddTracer.startSpan(name, {
    childOf: ddParentSpanContext
  })

  const jaegerParentSpanContext = jaegerTracer.extract(opentracing.FORMAT_HTTP_HEADERS, headersIn)
  const jaegerSpan = jaegerTracer.startSpan(name, {
    childOf: jaegerParentSpanContext
  })

  const span = new Span(ddSpan, jaegerSpan)
  span.injectHeaders(headersOut)

  return {span, headersOut}
}

