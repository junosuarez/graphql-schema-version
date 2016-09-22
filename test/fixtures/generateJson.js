const {
  readdirSync: readDir,
  readFileSync: readFile,
  writeFileSync: writeFile
} = require('fs')
const path = require('path')
const gql = require('graphql')

const fixtures = readDir(__dirname)
  .filter(filename => filename.endsWith('.gql'))
  .map(filename => path.join(__dirname, filename))
  .map(filename => ({
    filename,
    schema: String(readFile(filename))
  }))

// => Promise<JSONString>
function jsonFromSchema (schema) {
  return gql.graphql(gql.buildSchema(schema), gql.introspectionQuery)
    .then(result => JSON.stringify(result.data, null, 2))
}

const jsonFixtures = fixtures.map(fixture => {
  const jsonFilename = fixture.filename.replace(/.gql$/, '.json')
  return jsonFromSchema(fixture.schema).then(json => {
    writeFile(jsonFilename, json)
    console.log(`wrote ${jsonFilename}`)
  })
})

Promise.all(jsonFixtures).then(_ => console.log('done'))
