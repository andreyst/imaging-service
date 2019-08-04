const axios = require('axios')
const logger = require('../../util/logging.js').logger

async function ship(span, headers, orderId) {
  const shipping_service_endpoint = 'http://' + process.env['SHIPPING_SERVICE_HOST'] + ':' + process.env['SHIPPING_SERVICE_PORT']
  const url = shipping_service_endpoint + '/ship'
  const response = await axios.get(url, { headers });

  const success = response.data.success
  const shipped = response.data.shipped
  const event = shipped ? 'shipped' : 'shipping_failed'

  logger.info({message: 'Shipping request finished', success, shipped, orderId});
  span.log(event);
}


module.exports.ship = ship