const axios = require('axios')
const logger = require('../../util/logging.js').logger

async function pay(span, headers, orderId) {
  const payment_service_endpoint = 'http://' + process.env['PAYMENT_SERVICE_HOST'] + ':' + process.env['PAYMENT_SERVICE_PORT']
  const url = payment_service_endpoint + '/pay'
  const response = await axios.get(url, { headers });

  const success = response.data.success
  const paid = response.data.paid
  const event = paid ? 'paid' : 'payment_failed'

  logger.info({message: 'Payment request finished', success, paid, orderId});
  span.log({event});
}

module.exports.pay = pay