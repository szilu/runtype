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
 * Synchronous and asynchronous validators
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
| `object` (non-null object) | `T.unknownObject` |
| `{}` (anything but null/undefined) | `T.defined` |
| `void` | `T.voidType` |
| `never` | `T.never` |

`T.unknown` is the top type: it accepts *any* value, including `null` and `undefined`. Use `T.defined` if you want to reject them.

`T.unknownObject` accepts plain objects and arrays, but not functions - even though TypeScript's `object` type includes them.

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

**Object, array and `Date` defaults must use the factory form.** A stored value would be
returned **by reference** - every decoded value would share one instance, so mutating
one would corrupt the default for every later decode. For an object type the factory is
therefore the only form `default()` and `withDefault()` accept, and a stored value is a
**compile error**. The runtime **`TypeError`** stays as a backstop for the cases the type
system cannot decide, such as `T.unknown` and `T.any`. `Object.freeze()` is no escape
hatch: it is shallow, so a nested object stays mutable, and it does not stop `Date`'s
`setTime()`.

```typescript
T.struct({ a: T.string }).default({ a: 'x' })                  // compile error
T.struct({ a: T.string }).default(() => ({ a: 'x' }))          // OK
T.date.default(new Date())                                     // compile error
T.date.default(() => new Date())                               // OK
```

The default is decoded by the inner type like any other value, so a factory returning a
wrong-shaped value fails the decode instead of passing through unchecked.

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

`deepPartial()` and `deepPatch()` recurse into `T.struct()`, `T.record()`, `T.union()`,
`T.taggedUnion()` and `T.lazy()`. Arrays, tuples and `Date` are preserved as-is (not
recursed into).

They make **every** field optional, literal-valued ones included. A `T.taggedUnion()`
field is therefore rewritten as a plain `T.union()` of the deep-partialled members:
dispatch needs the tag to be present in the data, which a deep partial no longer
guarantees. A supplied tag still selects the right member (each member keeps its literal
tag prop), a tag-less object matches the first one. A value matching no member reports the
reason of the closest matching member - the one that failed on the fewest fields.

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

### Validators on derived types

`partial()`, `patch()`, `deepPartial()`, `deepPatch()`, `pick()` and `omit()` rebuild the
struct, and they carry the **nested** validators over to the derived type - the validators
of every nested `struct()`, `record()`, `union()`, `lazy()`, `optional()`/`nullable()` and
`withDefault()` field they rebuild along the way.

The **struct-level** validator of the source type is **dropped**: it was written against a
shape the derived type no longer has - `omit()` removes fields it reads, `partial()` makes
them absent. Re-attach it explicitly with `.addValidator()` on the result if it still
applies.

Decoder Options
---------------

The `decode()` function accepts an optional config argument. It can be used for type coercion:

```typescript
T.decode(T.number, '42')
// = { err: [ { path: [], error: 'expected number' } ] }

T.decode(T.number, '42', { coerceStringToNumber: true })
// = { ok: 42 }
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

Type constructors define some validator methods (like `minLength()` below) and user defined validator functions can also be attached.

```typescript
const tMyType = T.struct({
    s: T.string.minLength(2)
})
```

RunType has three entry points:

| Function | Sync? | Type decoding | Validators |
|----------|-------|---------------|------------|
| `T.decode(type, value, opts?)` | synchronous | yes | **never** runs validators |
| `T.validateSync(type, value, opts?)` | synchronous | yes | runs all synchronous validators, throws if the type has an asynchronous one |
| `T.validate(type, value, opts?)` | asynchronous | yes | runs all validators |

Validation works like decoding, but also runs the validators:

```typescript
await T.validate(T.string.minLength(2), 'abc')
// = { ok: 'abc' }

T.decode(T.string.minLength(2), 'a')
// = { ok: 'a' }        // decode() never runs validators

T.validateSync(T.string.minLength(2), 'a')
// = { err: [ { path: [], error: 'length must be at least 2' } ] }

await T.validate(T.string.minLength(2), 'a')
// = { err: [ { path: [], error: 'length must be at least 2' } ] }
```

### Synchronous Validation

`T.validateSync()` decodes the value and then runs every validator of the type and all of its nested types, without returning a Promise.

```typescript
T.validateSync(T.struct({ n: T.number.min(10) }), { n: 1 })
// = { err: [ { path: [ 'n' ], error: 'must be at least 10' } ] }
```

Asynchronous validators cannot be run synchronously, so `T.validateSync()` **throws an `AsyncValidatorError`** as soon as it reaches a type that carries one (see `addAsyncValidator()` below). This is loud on purpose: silently skipping such a validator would report the value as valid without ever checking it. The throw does not depend on the data: a type with an asynchronous validator throws even when its fields also failed validation, and an `AsyncValidatorError` raised inside a validator callback propagates instead of being reported as a validation error. Note that the check happens while walking the value, so it only fires on the branches that are actually visited — an asynchronous validator on a union member that did not match, or inside an `optional()` whose value is `undefined`, is never reached and never throws. Use `T.validate()` for types that carry asynchronous validators.

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

`addValidator()` attaches a synchronous validator function. It gets the decoded value and returns a `Result`:

```typescript
function max42(v: number) {
    return v <= 42 ? T.ok(v) : T.error("Max 42 is allowed!")
}

T.validateSync(T.number.addValidator(max42), 43)
// = { err: [ { path: [], error: "Max 42 is allowed!" } ] }

await T.validate(T.number.addValidator(max42), 43)
// = { err: [ { path: [], error: "Max 42 is allowed!" } ] }
```

`addAsyncValidator()` attaches a validator that may return a Promise. Such a validator can only be run by `T.validate()`:

```typescript
const tUserName = T.string.addAsyncValidator(async v =>
    await isNameFree(v) ? T.ok(v) : T.error('name is already taken')
)

await T.validate(tUserName, 'John')
// = { err: [ { path: [], error: 'name is already taken' } ] }

T.validateSync(tUserName, 'John')
// throws AsyncValidatorError: validateSync() cannot be used on type 'string': it has async validators, use validate() instead
```

Both modifiers are copy-on-write: they return a new type and leave the original untouched. Synchronous validators of a type always run before its asynchronous ones, regardless of the order they were added in, so with mixed validators the first reported error may not be the first one registered.

### Migrating to 1.3.0

 * `addValidator()` only accepts *synchronous* callbacks now. Move asynchronous ones to `addAsyncValidator()`.
 * `T.unknown` became the true top type and accepts `null` and `undefined` as well. Use the new `T.defined` for the old behaviour.
 * `T.struct()` and `T.taggedUnion()` reject arrays. Previously an array could decode as an object (as an empty struct with `unknownFields: 'drop'`).
 * The schema system (`T.schema()`, `T.schemaStrict()`, `T.schemaPartial()`, `T.schemaPatch()`, `T.schemaPost()`, `T.schemaPostPartial()`, `T.schemaKeys()`, `T.describeSchema()`) has been removed. Use `T.struct()` with `T.partial()` / `T.patch()` / `T.pick()` / `T.omit()`.
 * The legacy validator API (`T.validateOrig()` and the `ValidatorBase` / `NumberValidator` / `StringValidator` / `BooleanValidator` / `DateValidator` classes) has been removed. Use `addValidator()` / `addAsyncValidator()` on the types themselves.
 * Custom `Type` subclasses have to implement the new `validateSync()` method.
 * `T.unknownObject` is typed `object` instead of `{}`. It still rejects functions at runtime, although they are assignable to `object`.
 * `default()` / `withDefault()` reject object, array and `Date` defaults, frozen ones included: for an object type only the factory form type-checks, with a runtime `TypeError` as a backstop for `T.unknown` / `T.any`. Use `.default(() => ({ ... }))`. The default value is also decoded by the inner type now.
 * `deepPartial()` / `deepPatch()` recurse into `record()`, `union()`, `taggedUnion()`, `intersection()` and `lazy()` fields, and the inferred type follows: a mixed `union()` field like `T.union(tInner, T.number)` now infers as `DeepPartial<Inner> | number` instead of `Inner | number`. Every field becomes optional, literal-valued ones included, and a `taggedUnion()` field is rewritten as a plain `union()` of the deep-partialled members.
 * `partial()` / `patch()` / `deepPartial()` / `deepPatch()` / `pick()` / `omit()` keep the *nested* validators of the fields they rebuild; previously those were silently dropped. The source struct's own validator is dropped instead of carried over - re-attach it with `.addValidator()` on the result.
 * `Type` has a new `deepMap()` recursion hook. It has a default implementation, so custom `Type` subclasses need no change, but a custom **combinator** holding child types should override it to be reachable by `deepPartial()` / `deepPatch()`.
 * `struct()` decode no longer creates own keys for absent optional fields. A decoded `patch()` can therefore be spread over a stored record without wiping the fields it does not mention. An explicitly supplied `undefined` still keeps its key.
 * `optional()` / `nullable()` wrapped **directly** around `withDefault()` now apply the default instead of silently swallowing `undefined`. The delegation goes no further: any other inner type never sees the `undefined` / `null`, so decoder coercion options such as `coerceToArray` cannot fire on an absent field.
 * `union()` reports the closest matching member's own reason instead of a single `none of the union type members matched`, each message prefixed with `member <n>: `. Members that failed on the same number of fields are all reported. `validate()` and `validateSync()` do the same for the members that decoded but failed validation.
 * `ConstantType`, `LiteralType`, `TaggedUnionType`, `UnionType`, `RecordType` and `LazyType` are exported now.

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
