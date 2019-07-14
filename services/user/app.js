const app = require('express')()

const host = process.argv[2] || 'localhost'
const port = process.argv[3] || 8003

app.listen(port, host, () => console.log(`User service listening on ${host}:${port}!`))
