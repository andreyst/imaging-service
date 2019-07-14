const app = require('express')()
const request = require('request');
const uuid = require('uuid')

const host = process.env['UPLOADER_SERVICE_HOST'] || '0.0.0.0'
const port = process.env['UPLOADER_SERVICE_PORT'] || 8003

app.listen(port, host, () => console.log(`Uploader service listening on ${host}:${port}!`))

app.get('/', (req, res) => {
  return res.send({app: 'UploaderService'})
})

app.get('/upload', (req, res) => {
  console.log('Received an upload request!')

  access_service_endpoint = 'http://' + process.env['ACCESS_SERVICE_HOST'] + ':' + process.env['ACCESS_SERVICE_PORT']

  url = access_service_endpoint + '/authenticate'
  request(url, { json: true }, (err, res2, body) => {
    if (err) { return console.log(err); }
    console.log('Authentication request', body.result, 'authenticated', body.authenticated);

    url = access_service_endpoint + '/authorize'
    request(url, { json: true }, (err, res3, body) => {
      if (err) { return console.log(err); }
      console.log('Authorization request', body.result, 'authorized', body.authorized);

      let image_id = uuid.v4()
      console.log('Uploaded image', image_id)

      res.send({ success: true, image_id })
    });
  });
})

