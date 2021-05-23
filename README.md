Runtime type system for TypeScript
==================================

Description
-----------
Runtype is a runtime type system for TypeScript. It was inspired by IO-TS, but I made some opinionated changes in the concept.

Some of the changes:

 * I am not too familiar with functional programming concepts, so I don't use them in RunType.
 * The __struct__ combinator handles optional fields easier (without the partial intersection things)
 * __number__ decoder does not accept __NaN__.
 * __struct__ type provides 3 variations:
     * *normal*: as is
     * *partial*: fields can be undefined (or missing)
     * *patch*: optional fields can also be __null__. This can be useful for data updates (for example HTTP PATCH method) where __undefined__ means "do not update", __null__ means to clear the field.

Installation
------------
    npm install @symbion/runtype

Usage
-----
This is a work in progress. I plan to write some documentation soon, in the meantime you can look at the test files (src/*.spec.ts) for usage information.
