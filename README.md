Runtime type system for TypeScript
==================================

Description
-----------

*RunType* is a runtime type system for TypeScript.

It was inspired by IO-TS, but I made some opinionated changes in the concept. IO-TS is mathematically correct and follows JavaScript ant TypeScript specifications to the letter. With *RunType* I wanted to create something more practical.

Some of the changes:

 * I am not too familiar with functional programming concepts, so I don't use them in *RunType*.
 * The __struct__ combinator handles optional fields easier (without the partial + intersection things in IO-TS)
 * __number__ decoder does not accept __NaN__.
 * Decoder accepts a config argument and supports type coercion and some other modifiers
 * Validators
 * Runtime type description generation (print() method)

Installation
------------

    npm install @symbion/runtype

Usage
-----

This is a work in progress. I plan to write some documentation soon, in the meantime you can look at the test files (src/*.spec.ts) for usage information.

### Basic usage

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
isOk(decoded)
// = true

const value: MyType = decoded.ok
// = { s: 'string', n: 42 }
```


```typescript
```

| Type | TypeScript | RunType |
| ---- | ---------- | ------- |
| undefined    | undefined                                            | T.undefinedValue |
| null         | null                                                 | T.nullValue      |
| true         | true                                                 | T.trueValue      |
| false        | false                                                | T.falseValue     |
| string       | string                                               | T.string         |
| number       | number                                               | T.number         |
| integer      | X                                                    | T.integer        |
| boolean      | boolean                                              | T.boolean        |
| date         | date                                                 | T.date           |
| any          | any                                                  | T.any            |
| unknown      | unknown                                              | T.unknown        |
| literal      | `'a' | 'b' | 3`                                      | `T.literal('a', 'b', 3)` |
| optional     | `Type | undefined`                                   | `T.optional(tType)` |
| nullable     | `Type | null | undefined`                            | `T.nullable(tType)` |
| array        | `Array<Type>`                                        | `T.array(tType)` |
| record       | `record<string, Type>`                               | `T.record(tType)` |
| struct       | `{ s: string, n: number }`                           | `T.struct({ s: T.string, n: T.number })` |
| key of       | `keyof { s: string, n: number }`                     | `T.keyof(T.struct({ s: T.string, n: T.number }))` |
| tuple        | `[string, number, Type]`                             | `T.tuple(T.string, T.number, tType)` |
| union        | `string | number | Type`                             | `T.union(T.string, T.number, tType)` |
| tagged union | `{ tag: 's', s: string } | { tag: 'n', n: number }`  | `T.taggedUnion('tag')({ tag: T.literal('s'), s: T.string }, { tag: T.literal('n'), n: T.number })` |

### Decoder options

The decoder() function accepts an optional config argument. It can be used for type coercion:

```typescript
T.decode(T.number, '42')
// = { _tag: 'Err', err: [ { path: [], error: 'expected number' } ] }

T.decode(T.number, '42', { coerceStringToNumber: true })
// = isOk(decoded)
```

All available coercion options:

| Option name             | Type    |       |
| ----------------------- | ------- | ----- |
| coerceNumberToString    | boolean | Coerce numbers to string |
| coerceNumberToBoolean   | boolean | Coerce numbers to boolean |
| coerceStringToNumber    | boolean | Coerce string to number |
| coerceScalar            | boolean | = coerceNumberToString, coerceNumberToBoolean, coerceStringToNumber |
| coerceStringToDate      | boolean | Coerce string to Date |
| coerceNumberToDate      | boolean | Coerce numbers to Date |
| coerceDate              | boolean | = coerceStringToDate, coerceNumberToDate |
| coerceAll               | boolean | All the above coercion |
| acceptNaN               | boolean | Make T.number accept NaN as number |
| unknownFields           | `'reject' | 'drop' | 'discard'` | How to treat unknown fields. (_reject_: error, _drop_: drops unknown fields from the output, _discard_: leaves in output as is) |

### Validation

The _decode()_ function does type decoding, which is a synchron function.
Runtype also handles data validation, what is defined as an asynchron function. The type constructors define some validator methods and user defined functions can also be used.

```typescript
const tMyType = struct({
	s: t.string.minLength(2)
})
```

Validation works like decoding:

```typescript
T.validate(T.string.minLength(2), 'abc')
// = { _tag: 'Ok', ok: 'abc' }

T.decode(T.string.minLength(2), 'a')
// = { _tag: 'Ok', ok: 'a' }
T.validate(T.string.minLength(2), 'a')
// = { _tag: 'Err', err: [ { path: [], error: 'length must be at least 2' } ] }
```

Awailable validators:

#### String validators

| Validator | Description |
|-|-|
| in(value1, value2, ...) | Value is one of _value1_, value2, .... |
| minLength(length)       | Length is at least _length_ |
| maxLength(length)       | Length is at most _length_ |
| matches(pattern)        | Value matches _pattern_ |
| email()                 | Value is an email address |

#### Number validators

| Validator | Description |
|-|-|
| in(value1, value2, ...)     | Value is one of _value1_, value2, .... |
| integer()                   | Value is an integer |
| min(minValue)               | Value is at least _minValue_ |
| max(maxValue)               | Value is at most _maxValue_ |
| between(minValue, maxValue) | Value is between _minValue_ and _maxValue_ |

#### Boolean validators

| Validator | Description |
|-|-|
| true()                      | Value is true |
| false()                     | Value is false |

#### Literal validators

| Validator | Description |
|-|-|
| in(value1, value2, ...) | Value is one of _value1_, value2, .... |

#### Custom validators

```typescript
function max42(v: number | undefined) {
	return (v || 0) <= 42 ? T.ok(v) : T.error("Max 42 is allowed!")
}

await T.validate(T.number.addValidator(max42), 43)
// = { _tag: 'Err', err: [ { path: [], error: "Max 42 is allowed!" } ] }
```

Internals
---------

### Missing properties vs undefined

TypeScript (because of JavaScript) differentiates missing properties and properties with __undefined__ value. This is sometimes useful, however it makes it more difficult to handle this in runtime type systems.
Take the following simple TypeScript type:

```typescript
interface Person {
	name: string
	age?: number
}
```

In IO-TS you can create it like this:

```typescript
const tPerson = t.intersection([
	t.type({
		name: t.string
	}),
	t.partial({
		age: t.number
	})
type Person = t.TypeOf<typeof tPerson>
])
```

*RunType* uses complex TypeScript mechanisms to achieve a simpler and readable syntax:

```typescript
const tPerson = t.struct({
	name: t.string
	age: t.optional(t.number)
])
type Person = t.TypeOf<typeof tPerson>
```

Under the hood RunType generates the same intersection type beacause of limitations in TypeScipt, but it works the same as the original type:

```typescript
type Person = { name: string } & { age?: number }
```

Closing thoughts
----------------

If you want to boost your TypeScript knowledge to the next level I highly recommend to write a runtime type system. I guarantee it will be fun! :)
