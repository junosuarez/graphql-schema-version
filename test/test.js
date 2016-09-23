/* globals describe, it, beforeEach */

const { expect } = require('chai')
const { cloneDeep } = require('lodash')

function cloneBaseSchema () {
  return cloneDeep(require('./fixtures/baseSchema.json'))
}

describe('graphql-schema-version', () => {
  const graphqlSchemaVersion = require('../')
  let newSchema
  let oldSchema
  let oldVersion

  beforeEach(() => {
    newSchema = require('./fixtures/baseSchema.json')
    oldSchema = require('./fixtures/baseSchema.json')
    oldVersion = '1.0.0'
  })

  it('returns oldVersion if no old schema is supplied', () => {
    newSchema = {}
    expect(graphqlSchemaVersion(newSchema, null, '5.0.0')).to.equal('5.0.0')
  })

  it('defaults to `1.0.0` if oldVersion is not supplied', () => {
    newSchema = {}
    expect(graphqlSchemaVersion(newSchema)).to.equal('1.0.0')
  })

  it('works if the top-level `data` property is present in the json', () => {
    const schema = {data: newSchema}
    expect(graphqlSchemaVersion(schema, schema)).to.equal('1.0.0')
  })

  it('increments patch version if field is deprecated', () => {
    newSchema = cloneBaseSchema()
    const heroField = newSchema.__schema.types[0].fields[0]
    heroField.isDeprecated = true
    heroField.deprecationReason = 'test'
    expect(graphqlSchemaVersion(newSchema, oldSchema, oldVersion)).to.equal('1.0.1')
  })

  it('increments minor version if enum type is added', () => {
    newSchema = require('./fixtures/enumTypeAdded.json')
    expect(graphqlSchemaVersion(newSchema, oldSchema, oldVersion)).to.equal('1.1.0')
  })

  it('increments minor version if enum value is added', () => {
    newSchema = require('./fixtures/enumValueAdded.json')
    expect(graphqlSchemaVersion(newSchema, oldSchema, oldVersion)).to.equal('1.1.0')
  })

  it('increments minor version if type is added', () => {
    newSchema = require('./fixtures/typeAdded.json')
    expect(graphqlSchemaVersion(newSchema, oldSchema, oldVersion)).to.equal('1.1.0')
  })

  it('increments major version if type is deleted', () => {
    newSchema = require('./fixtures/typeDeleted.json')
    expect(graphqlSchemaVersion(newSchema, oldSchema, oldVersion)).to.equal('2.0.0')
  })

  it('increments minor version if field is added', () => {
    newSchema = require('./fixtures/fieldAdded.json')
    expect(graphqlSchemaVersion(newSchema, oldSchema, oldVersion)).to.equal('1.1.0')
  })

  it('increments major version if field is deleted', () => {
    newSchema = require('./fixtures/fieldDeleted.json')
    expect(graphqlSchemaVersion(newSchema, oldSchema, oldVersion)).to.equal('2.0.0')
  })
  it('increments major version if field type changed', () => {
    newSchema = require('./fixtures/fieldTypeChanged.json')
    expect(graphqlSchemaVersion(newSchema, oldSchema, oldVersion)).to.equal('2.0.0')
  })
  it('increments minor version if field argument added', () => {
    newSchema = require('./fixtures/fieldArgumentAdded.json')
    expect(graphqlSchemaVersion(newSchema, oldSchema, oldVersion)).to.equal('1.1.0')
  })
  it('increments major version if field argument deleted', () => {
    newSchema = require('./fixtures/fieldArgumentDeleted.json')
    expect(graphqlSchemaVersion(newSchema, oldSchema, oldVersion)).to.equal('2.0.0')
  })
  it('increments major version if field argument type changed', () => {
    newSchema = require('./fixtures/fieldArgumentTypeChanged.json')
    expect(graphqlSchemaVersion(newSchema, oldSchema, oldVersion)).to.equal('2.0.0')
  })

  it('increments patch version if directive is added', () => {
    newSchema = cloneBaseSchema()
    const directives = newSchema.__schema.directives
    directives.push({
      name: 'test',
      description: 'a test directive',
      locations: [
        'FIELD',
        'FRAGMENT_SPREAD',
        'INLINE_FRAGMENT'
      ],
      args: []
    })
    expect(graphqlSchemaVersion(newSchema, oldSchema, oldVersion)).to.equal('1.0.1')
  })
  it('increments major version if directive is deleted', () => {
    newSchema = cloneBaseSchema()
    const directives = newSchema.__schema.directives
    directives.pop()
    expect(graphqlSchemaVersion(newSchema, oldSchema, oldVersion)).to.equal('2.0.0')
  })

  it('increments major version if enum type is deleted', () => {
    newSchema = require('./fixtures/enumTypeDeleted.json')
    expect(graphqlSchemaVersion(newSchema, oldSchema, oldVersion)).to.equal('2.0.0')
  })
  it('increments major version if enum value is deleted', () => {
    newSchema = require('./fixtures/enumValueDeleted.json')
    expect(graphqlSchemaVersion(newSchema, oldSchema, oldVersion)).to.equal('2.0.0')
  })

  it('increments minor version if field type changes from non-nullable to nullable of the same inner type', () => {
    newSchema = require('./fixtures/fieldTypeChangedFromNonNullable.json')
    expect(graphqlSchemaVersion(newSchema, oldSchema, oldVersion)).to.equal('1.1.0')
  })

  it.only('parses with input fields', () => {
    newSchema = require('./fixtures/mutationTypes.json')
    expect(graphqlSchemaVersion(newSchema, newSchema, oldVersion)).to.equal('1.0.0')
  })
})
