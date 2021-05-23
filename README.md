Runtime type system for TypeScript
==================================

Description
-----------

*RunType* is a runtime type system for TypeScript.

It was inspired by IO-TS, but I made some opinionated changes in the concept. IO-TS is mathematically correct and follows JavaScript ant TypeScript specifications to the letter. With *RunType* I wanted to create something more practical.

Some of the changes:

 * I am not too familiar with functional programming concepts, so I don't use them in *RunType*.
 * The __struct__ combinator handles optional fields easier (without the partial + intersection things in IO-TS)
 * __struct__ type provides 3 variations:
     * *normal*: as is
     * *partial*: fields can be __undefined__ (or missing)
     * *patch*: optional fields can also be __null__. This can be useful for data updates (for example HTTP PATCH method) where __undefined__ means "do not update", __null__ means to clear the field.
 * __number__ decoder does not accept __NaN__.

More to come:

 * Runtime type description generation (print() method)
 * Validators

Installation
------------

    npm install @symbion/runtype

Usage
-----

This is a work in progress. I plan to write some documentation soon, in the meantime you can look at the test files (src/*.spec.ts) for usage information.

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
