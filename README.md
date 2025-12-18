Runtime Type System for TypeScript
===================================

Description
-----------

**RunType** is a runtime type system for TypeScript.

It was inspired by IO-TS, but I made some opinionated changes in the concept. IO-TS is mathematically correct and follows JavaScript and TypeScript specifications to the letter. With RunType I wanted to create something more practical.

Some of the changes:

 * I am not too familiar with functional programming concepts, so I don't use them in RunType.
 * The **struct** combinator handles optional fields easier (without the partial + intersection things in IO-TS)
 * **number** decoder does not accept **NaN**.
 * Decoder accepts a config argument and supports type coercion and some other modifiers
 * Validators
 * Runtime type description generation (print() method)

Installation
------------

```bash
npm install @symbion/runtype
```

Usage
-----

### Basic Usage

First create a type:

```typescript
import T from '@symbion/runtype'

const tMyType = T.struct({
    s: T.string,
    n: T.optional(T.number)
})
```

You can extract a TypeScript type from it:

```typescript
type MyType = T.TypeOf<typeof tMyType>
```

You can decode an unknown value:

```typescript
const u: unknown = { s: 'string', n: 42 }

const decoded = T.decode(tMyType, u)
T.isOk(decoded)
// = true

const value: MyType = decoded.ok
// = { s: 'string', n: 42 }
```

Type Constructors
-----------------

### Primitive Types

| TypeScript | RunType |
|------------|---------|
| `string` | `T.string` |
| `number` | `T.number` |
| `number` (integer only) | `T.integer` |
| `number` (integer alias) | `T.id` |
| `boolean` | `T.boolean` |
| `bigint` | `T.bigint` |
| `symbol` | `T.symbol` |
| `Date` | `T.date` |

### Special Types

| TypeScript | RunType |
|------------|---------|
| `undefined` | `T.undefinedValue` |
| `null` | `T.nullValue` |
| `true` | `T.trueValue` |
| `false` | `T.falseValue` |
| `any` | `T.any` |
| `unknown` | `T.unknown` |
| `{}` (non-null object) | `T.unknownObject` |
| `void` | `T.voidType` |
| `never` | `T.never` |

### Literal Types

```typescript
T.literal('a', 'b', 3)
// TypeScript: 'a' | 'b' | 3
```

### Compound Types

| Type | TypeScript | RunType |
|------|------------|---------|
| Array | `Array<Type>` | `T.array(tType)` |
| Record | `Record<string, Type>` | `T.record(tType)` |
| Struct | `{ s: string, n: number }` | `T.struct({ s: T.string, n: T.number })` |
| Tuple | `[string, number, Type]` | `T.tuple(T.string, T.number, tType)` |
| Union | `string \| number \| Type` | `T.union(T.string, T.number, tType)` |
| Intersection | `{ s: string } & { n: number }` | `T.intersection(T.struct({ s: T.string }), T.struct({ n: T.number }))` |
| Tagged union | `{ tag: 's', s: string } \| { tag: 'n', n: number }` | `T.taggedUnion('tag')({ str: T.struct({ tag: T.literal('str'), s: T.string }), num: T.struct({ tag: T.literal('num'), n: T.number }) })` |
| Key of | `keyof { s: string, n: number }` | `T.keyof(T.struct({ s: T.string, n: T.number }))` |

### Wrapper Types

| Type | TypeScript | RunType |
|------|------------|---------|
| Optional | `Type \| undefined` | `T.optional(tType)` or `tType.optional()` |
| Nullable | `Type \| null \| undefined` | `T.nullable(tType)` or `tType.nullable()` |
| Default | `Type` (with fallback) | `tType.default(value)` or `T.withDefault(tType, value)` |

Chainable Methods
-----------------

The `optional()`, `nullable()`, and `default()` modifiers can be chained directly on types:

```typescript
// Chainable syntax
const tOptional = T.string.optional()
const tNullable = T.number.nullable()
const tWithDefault = T.string.default('fallback')

// Factory functions (also available)
const tOptional2 = T.optional(T.string)
const tNullable2 = T.nullable(T.number)
const tWithDefault2 = T.withDefault(T.string, 'fallback')
```

The `default()` modifier accepts either a value or a factory function:

```typescript
T.string.default('static value')
T.array(T.string).default(() => [])  // Factory function for mutable defaults
```

Recursive Types
---------------

Recursive types can be created with **T.lazy()** and manual TypeScript types (because TypeScript can't infer recursive types):

```typescript
interface Recursive {
    name: string
    children: Recursive[]
}

const tRecursive: T.Type<Recursive> = T.lazy(() => T.struct({
    name: T.string,
    children: T.array(tRecursive)
}))
```

Type Modifiers
--------------

### partial

The **T.partial()** type modifier takes a **Struct** type and converts all fields to optional:

```typescript
const tStruct = T.struct({
    s: T.string,
    n: T.optional(T.number)
})
// = { s: string, n?: number }

const tPartialType = T.partial(tStruct)
// = { s?: string, n?: number }
```

### patch

The **T.patch()** type modifier takes a **Struct** type and converts all *optional* fields to *nullable* and all *required* fields to *optional*.
It is useful for update APIs, where *undefined* or missing fields mean not to update and *null* value means to clear that field.

```typescript
const tStruct = T.struct({
    s: T.string,
    n: T.optional(T.number)
})
// = { s: string, n?: number }

const tPatchType = T.patch(tStruct)
// = { s?: string, n?: number | null }
```

### pick

The **T.pick()** type modifier takes a **Struct** type and picks the specified fields.

```typescript
const tStruct = T.struct({
    s: T.string,
    n: T.optional(T.number),
    b: T.boolean
})
// = { s: string, n?: number, b: boolean }

const tPickType = T.pick(tStruct, ['s', 'n'])
// = { s: string, n?: number }
```

### omit

The **T.omit()** type modifier takes a **Struct** type and omits the specified fields.

```typescript
const tStruct = T.struct({
    s: T.string,
    n: T.optional(T.number),
    b: T.boolean
})
// = { s: string, n?: number, b: boolean }

const tOmitType = T.omit(tStruct, ['b'])
// = { s: string, n?: number }
```

### deepPartial

The **T.deepPartial()** type modifier recursively makes all nested struct fields optional:

```typescript
const tStruct = T.struct({
    name: T.string,
    address: T.struct({
        city: T.string,
        zip: T.string
    })
})
// = { name: string, address: { city: string, zip: string } }

const tDeepPartial = T.deepPartial(tStruct)
// = { name?: string, address?: { city?: string, zip?: string } }
```

Arrays and Date types are preserved as-is (not recursed into).

### deepPatch

The **T.deepPatch()** type modifier is the deep version of `patch()`, applying patch semantics recursively:

```typescript
const tStruct = T.struct({
    name: T.string,
    profile: T.struct({
        bio: T.optional(T.string),
        age: T.number
    })
})

const tDeepPatch = T.deepPatch(tStruct)
// Required fields become optional, optional fields become nullable, recursively
```

Decoder Options
---------------

The `decode()` function accepts an optional config argument. It can be used for type coercion:

```typescript
T.decode(T.number, '42')
// = { _tag: 'Err', err: [ { path: [], error: 'expected number' } ] }

T.decode(T.number, '42', { coerceStringToNumber: true })
// = { _tag: 'Ok', ok: 42 }
```

### Scalar Coercion

| Option | Description |
|--------|-------------|
| `coerceNumberToString` | Coerce numbers to string |
| `coerceNumberToBoolean` | Coerce numbers to boolean |
| `coerceStringToNumber` | Coerce string to number |
| `coerceScalar` | Enable all scalar coercions above |

### Date Coercion

| Option | Description |
|--------|-------------|
| `coerceStringToDate` | Coerce string to Date |
| `coerceNumberToDate` | Coerce number to Date (timestamp) |
| `coerceDate` | Enable all date coercions above |

### BigInt Coercion

| Option | Description |
|--------|-------------|
| `coerceStringToBigInt` | Coerce string to bigint |
| `coerceNumberToBigInt` | Coerce integer number to bigint |
| `coerceBigInt` | Enable all bigint coercions above |

### Array Coercion

| Option | Description |
|--------|-------------|
| `coerceToArray` | Custom function `(value: unknown) => unknown` to convert values to arrays |

### Other Options

| Option | Type | Description |
|--------|------|-------------|
| `coerceAll` | `boolean` | Enable all coercion options |
| `acceptNaN` | `boolean` | Make `T.number` accept NaN as a valid number |
| `unknownFields` | `'reject' \| 'drop' \| 'discard'` | How to handle unknown fields in structs: *reject* (error, default), *drop* (remove from output), *discard* (keep in output) |

Validation
----------

The `decode()` function does type decoding, which is a synchronous function.
RunType also handles data validation, which is defined as an asynchronous function. The type constructors define some validator methods and user defined functions can also be used.

```typescript
const tMyType = T.struct({
    s: T.string.minLength(2)
})
```

Validation works like decoding:

```typescript
await T.validate(T.string.minLength(2), 'abc')
// = { _tag: 'Ok', ok: 'abc' }

T.decode(T.string.minLength(2), 'a')
// = { _tag: 'Ok', ok: 'a' }

await T.validate(T.string.minLength(2), 'a')
// = { _tag: 'Err', err: [ { path: [], error: 'length must be at least 2' } ] }
```

### String Validators

| Validator | Description |
|-----------|-------------|
| `in(value1, value2, ...)` | Value is one of the specified values |
| `length(len)` | Length equals `len` |
| `length(min, max)` | Length is between `min` and `max` |
| `minLength(len)` | Length is at least `len` |
| `maxLength(len)` | Length is at most `len` |
| `matches(pattern)` | Value matches the RegExp `pattern` |
| `email()` | Value is a valid email address |

### Number Validators

| Validator | Description |
|-----------|-------------|
| `in(value1, value2, ...)` | Value is one of the specified values |
| `integer()` | Value is an integer |
| `min(minValue)` | Value is at least `minValue` |
| `max(maxValue)` | Value is at most `maxValue` |
| `between(min, max)` | Value is between `min` and `max` |

### BigInt Validators

| Validator | Description |
|-----------|-------------|
| `min(minValue)` | Value is at least `minValue` |
| `max(maxValue)` | Value is at most `maxValue` |
| `between(min, max)` | Value is between `min` and `max` |
| `positive()` | Value is greater than 0 |
| `negative()` | Value is less than 0 |
| `nonNegative()` | Value is 0 or greater |

### Boolean Validators

| Validator | Description |
|-----------|-------------|
| `true()` | Value is true |
| `false()` | Value is false |

### Array Validators

| Validator | Description |
|-----------|-------------|
| `length(len)` | Length equals `len` |
| `length(min, max)` | Length is between `min` and `max` |
| `minLength(len)` | Length is at least `len` |
| `maxLength(len)` | Length is at most `len` |

### Literal Validators

| Validator | Description |
|-----------|-------------|
| `in(value1, value2, ...)` | Value is one of the specified values |

### Custom Validators

```typescript
function max42(v: number | undefined) {
    return (v || 0) <= 42 ? T.ok(v) : T.error("Max 42 is allowed!")
}

await T.validate(T.number.addValidator(max42), 43)
// = { _tag: 'Err', err: [ { path: [], error: "Max 42 is allowed!" } ] }
```

Internals
---------

### Missing Properties vs Undefined

TypeScript (because of JavaScript) differentiates missing properties and properties with **undefined** value. This is sometimes useful, however it makes it more difficult to handle this in runtime type systems.
Take the following simple TypeScript type:

```typescript
interface Person {
    name: string
    age?: number
}
```

In IO-TS you can create it like this:

```typescript
const tPerson = T.intersection([
    T.type({
        name: T.string
    }),
    T.partial({
        age: T.number
    })
])
type Person = T.TypeOf<typeof tPerson>
```

RunType uses complex TypeScript mechanisms to achieve a simpler and readable syntax:

```typescript
const tPerson = T.struct({
    name: T.string,
    age: T.optional(T.number)
})
type Person = T.TypeOf<typeof tPerson>
```

Under the hood RunType generates the same intersection type because of limitations in TypeScript, but it works the same as the original type:

```typescript
type Person = { name: string } & { age?: number }
```

Closing Thoughts
----------------

If you want to boost your TypeScript knowledge to the next level I highly recommend to write a runtime type system. I guarantee it will be fun! :)
