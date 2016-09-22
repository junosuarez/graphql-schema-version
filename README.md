# graphql-schema-version
derive a semver version number from a graphql schema

[![js-standard-style](https://cdn.rawgit.com/feross/standard/master/badge.svg)](https://github.com/feross/standard)


## usage
```js
const graphqlSchemaVersion = require('graphql-schema-version')

const newSchema = require('./newClientSchema.json')
const oldSchema = require('./oldClientSchema.json')
const oldVersion = '2.3.0'
console.log(graphqlSchemaVersion(newSchema, oldSchema, oldVersion))
```
prints a semver for the relation, e.g. `2.4.0` for a minor version increment or `3.0.0` for major.

the schema documents it takes as arguments are the JSON documents generated from the client introspection query - see http://graphql.org/graphql-js/utilities/#printintrospectionschema

### Spec
    graphql-schema-version
    ✓ returns oldVersion if no old schema is supplied
    ✓ defaults to `1.0.0` if oldVersion is not supplied
    ✓ increments patch version if field is deprecated
    ✓ increments minor version if enum type is added
    ✓ increments minor version if enum value is added
    ✓ increments minor version if type is added
    ✓ increments major version if type is deleted
    ✓ increments minor version if field is added
    ✓ increments major version if field is deleted
    ✓ increments major version if field type changed
    ✓ increments minor version if field argument added
    ✓ increments major version if field argument deleted
    ✓ increments major version if field argument type changed
    ✓ increments patch version if directive is added
    ✓ increments major version if directive is deleted
    ✓ increments major version if enum type is deleted
    ✓ increments major version if enum value is deleted
    ✓ increments minor version if field type changes from non-nullable to nullable of the same inner type


## installation

    $ npm install graphql-schema-version


## running the tests

From package root:

    $ npm install
    $ npm test


## contributors

- jden <jason@denizac.org>


## todo
- [ ] rewrite with proper visitor pattern for maintainability


## license

ISC. (c) MMXVI jden <jason@denizac.org>. See LICENSE.md
