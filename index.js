const {
  buildClientSchema,
  GraphQLEnumType,
  GraphQLNonNull,
  GraphQLList
} = require('graphql')
const semver = require('semver')
const {
  differenceBy,
  filter
} = require('lodash')
const debug = require('debug')('graphql-schema-version')

// type Schema : Object
// type SemVerString : String

const DEFAULT_VERSION = '1.0.0'

// a bitmap of Mmp
const INCREMENT_MAJOR = 4
const INCREMENT_MINOR = 2
const INCREMENT_PATCH = 1
const INCREMENT_NONE = 0

class SetPair {
  constructor (a, b, identityFn = x => x) {
    this.a = a
    this.b = b
    this.identityFn = identityFn

    this.outerA = differenceBy(a, b, identityFn)
    this.outerB = differenceBy(b, a, identityFn)
    this.inner = this._inner
  }

  get _inner () {
    return this.a.map(a => {
      const Ia = this.identityFn(a)
      const b = this.b.find(b => this.identityFn(b) === Ia)
      return b && new Pair(a, b)
    }).filter(Boolean)
  }

  get superCardinality () {
    return this.outerA.length + this.outerB.length + this.inner.length
  }
}

class Pair {
  constructor (a, b, id) {
    this.id
    this.a = a
    this.b = b
  }

  diff (map, identity = x => x) {
    return new SetPair(map(this.a), map(this.b), identity)
  }

  diffBy (identity = x => x) {
    return new SetPair(this.a, this.b, identity)
  }

  map (fn) {
    return new Pair(fn(this.a), fn(this.b))
  }

  eq (predicate) {
    return predicate(this.a) === predicate(this.b)
  }

  some (predicate) {
    return
  }

  every (predicate) {

  }
}

// (Schema, Schema?) => SemverString
function graphqlSchemaVersion (newSchema, oldSchema = null, oldVersion = DEFAULT_VERSION) {
  if (!oldSchema) { return oldVersion }

  const increment = diffSchema(new Pair(newSchema, oldSchema)
      .map(normalizeSchema)
      .map(buildClientSchema))
  if (increment === INCREMENT_NONE) { return oldVersion }
  if (increment < INCREMENT_MINOR) { return semver.inc(oldVersion, 'patch') }
  if (increment < INCREMENT_MAJOR) { return semver.inc(oldVersion, 'minor') }
  if (increment === INCREMENT_MAJOR) { return semver.inc(oldVersion, 'major') }
}

function normalizeSchema (schema) {
  if (schema.data) { return schema.data }
  return schema
}

function diffSchema (schemas) {
  const rules = [
    checkEnums,
    // checkUnions,
    checkTypes,
    checkDirectives
  ]

  return rules.reduce((memo, rule) => {
    if (memo.done) { return memo }
    memo.increment |= (rule(schemas) || 0)
    if (memo.incrment > INCREMENT_MINOR) { memo.done = true }
    return memo
  }, {increment: INCREMENT_NONE, done: false}).increment
}

function checkEnums (schemas) {
  const enums = schemas.map(schema =>
    filter(schema.getTypeMap(), t => t instanceof GraphQLEnumType))

  const pairs = new SetPair(enums.a, enums.b, e => e.name)
  // console.log(pairs)
  if (pairs.outerB.length) {
    debug(`Enum Type deleted: ${pairs.outerB}`)
    return INCREMENT_MAJOR
  }

  const increment = checkEnumValues(pairs.inner)
  if (increment) { return increment }

  if (pairs.outerA.length) {
    debug(`Enum Type added: ${pairs.outerA.map(e => e.name).join()}`)
    return INCREMENT_MINOR
  }
}

function checkEnumValues (enums) {
  return enums.reduce((memo, enumDef) => {
    if (memo.done) { return memo }
    const values = new SetPair(enumDef.a._values, enumDef.b._values, e => e.name)
    if (values.outerB.length) {
      debug(`Enum Value deleted in ${enumDef.a.name}: ${values.outerB.map(v => v.name).join()}`)
      memo.increment = INCREMENT_MAJOR
      memo.done = true
      return memo
    }
    if (values.outerA.length) {
      debug(`Enum value added in ${enumDef.a.name}: ${values.outerA.map(v => v.name).join()}`)
      memo.increment = INCREMENT_MINOR
    }
    return memo
  }, {increment: INCREMENT_NONE, done: false}).increment
}

function checkTypes (schemas) {
  const types = schemas
    .map(schema => filter(schema.getTypeMap(), t => !(t instanceof GraphQLEnumType)))
    .diffBy(e => e.name)

  if (types.outerB.length) {
    debug(`Type deleted: ${types.outerB.map(t => t.name).join()}`)
    return INCREMENT_MAJOR
  }

  const fieldsIncrement = checkTypeFields(types.inner)

  if (fieldsIncrement) { return fieldsIncrement }

  if (types.outerA.length) {
    debug(`Type added: ${types.outerA.map(t => t.name).join()}`)
    return INCREMENT_MINOR
  }
}

function checkTypeFields (types) {
  return types.reduce((memo, type) => {
    if (memo.done) { return memo }
    if (!type.a._fields) { return memo } // scalar

    const fields = new SetPair(values(type.a._fields), values(type.b._fields), e => e.name)
    if (fields.outerB.length) {
      debug(`Type field deleted in ${type.a.name}: ${fields.outerB.map(f => f.name).join()}`)
      memo.increment |= INCREMENT_MAJOR
      memo.done = true
      return memo
    }

    const increment = fields.inner.reduce((memo, field) => {
      if (!field.eq(f => nameOfType(f.type))) {
        // check if loosened from non-nullable -> nullable of same type
        if (`${nameOfType(field.a.type)}!` === nameOfType(field.b.type)) {
          memo.increment |= INCREMENT_MINOR
          return memo
        }

        debug(`Field type changed: ${type.a.name}#${field.a.name} from ${nameOfType(field.b.type)} to ${nameOfType(field.a.type)}`)
        memo.increment |= INCREMENT_MAJOR
        memo.done = true
        return memo
      }

      memo.increment |= checkFieldArguments(field.diff(f => f.args, a => a.name), field)

      if (!field.eq(f => f.deprecationReason)) {
        memo.increment |= INCREMENT_PATCH
      }

      return memo
    }, {increment: INCREMENT_NONE, done: false}).increment
    if (increment) {
      memo.increment |= increment
      return memo
    }

    if (fields.outerA.length) {
      debug(`Type field added in ${type.a.name}: ${fields.outerA.map(f => f.name).join()}`)
      memo.increment |= INCREMENT_MINOR
    }
    return memo
  }, {increment: INCREMENT_NONE, done: false}).increment
}

function nameOfType (type) {
  // account for generic types
  if (type.ofType) {
    switch (type.constructor) {
      case GraphQLNonNull:
        // console.log('nonull', type)
        return `${nameOfType(type.ofType)}!`
      case GraphQLList:
        return `[${nameOfType(type.ofType)}]`
      default:
        return '<!!UnknownType!!>'
    }
  }
  if (type.name) { return type.name }
}

function checkFieldArguments (args, field) {
  if (args.superCardinality === 0) { return INCREMENT_NONE }

  if (args.outerB.length) {
    debug(`Field argument deleted: ${args.outerB.map(a => a.name).join()} in ${field.a.name}`)
    return INCREMENT_MAJOR
  }

  const increment = args.inner.reduce((memo, arg) => {
    if (memo.done) { return memo }
    if (arg.a.type.name === arg.b.type.name) { return memo }
    memo.increment |= INCREMENT_MAJOR
    return memo
  }, {increment: INCREMENT_NONE, done: false}).increment
  if (increment) { return increment }

  if (args.outerA.length) {
    debug(`Field argument added: ${args.outerA.map(a => a.name).join()} in ${field.a.name}`)
    return INCREMENT_MINOR
  }
  return INCREMENT_NONE
}

function checkDirectives (schemas) {
  const directives = schemas.map(s => s.getDirectives()).diffBy(d => d.name)

  if (directives.outerB.length) {
    debug(`Directive deleted: ${directives.outerB.map(d => d.name).join()}`)
    return INCREMENT_MAJOR
  }
  if (directives.outerA.length) {
    debug(`Directive added: ${directives.outerA.map(d => d.name).join()}`)
    return INCREMENT_PATCH
  }

  return INCREMENT_NONE
}

function values (obj) {
  return Object.keys(obj).map(k => obj[k])
}

module.exports = graphqlSchemaVersion
