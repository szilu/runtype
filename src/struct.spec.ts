import * as t from './index.js'
import './jest.local.js'

declare global {
	namespace jest {
		interface Matchers<R> {
			toBeErr(pattern?: string): R
		}
	}
}

describe('test struct type', () => {
	// Struct
	const tStruct = t.struct({
		s: t.string,
		n: t.number,
		b: t.optional(t.boolean)
	})
	type Struct = t.TypeOf<typeof tStruct>

	const tPartial = t.partial(tStruct)
	type Partial = t.TypeOf<typeof tPartial>

	const tPatch = t.patch(tStruct)
	type Patch = t.TypeOf<typeof tPatch>

	/*
	const tS = t.struct({
		a: t.union(
			t.struct({
				s: t.string
			}),
			t.struct({
				n: t.number
			})
		),
		v: t.array(t.tuple(t.integer, t.integer))
	})

	type TS = t.TypeOf<typeof tS>

	const ts: TS = {
		a: { s: '42', n: 42, x: 4 },
		v: [[1, 2]]
	}


	type TS2 = {
		a: { s: string } | { n: number }
		v: [number, number][]
	}
	const ts2: TS = {
		a: { s: '42', n: 42 },
		v: [[1, 2]]
	}
	*/

	// These are compile time tests for the TS type inference :)
	const struct1: Struct = { s: 'string', n: 42, b: true }
	const struct2: Struct = { s: 'string', n: 42 }

	// Uncomment these to test TS type inference
	// const structE3: Struct = { s: 'string', n: null }

	const partial1: Partial = { s: 'string' }

	//const partialE2: Partial = { s: 'string', n: null }

	describe('test struct decode', () => {
		it('should accept struct', () => {
			expect(t.decode(tStruct, { s: 'string', n: 42, b: true })).toEqual(
				t.ok({ s: 'string', n: 42, b: true })
			)
		})

		it('should reject scalar', () => {
			expect(t.decode(tStruct, 42)).toBeErr()
		})

		it('should reject null', () => {
			expect(t.decode(tStruct, null)).toBeErr()
		})

		it('should reject array', () => {
			expect(t.decode(tStruct, [42])).toBeErr()
		})

		it('should reject array for an all-optional struct', () => {
			const tAllOpt = t.struct({ b: t.optional(t.boolean) })
			expect(t.decode(tAllOpt, [])).toBeErr()
			expect(t.decode(tAllOpt, [1, 2], { unknownFields: 'drop' })).toBeErr()
		})

		it('should reject array with unknownFields opts', () => {
			expect(t.decode(tStruct, [], { unknownFields: 'drop' })).toBeErr()
			expect(t.decode(tStruct, [], { unknownFields: 'discard' })).toBeErr()
		})

		it('should accept a class instance', () => {
			class P {
				s = 'string'
				n = 42
			}
			expect(t.decode(tStruct, new P())).toEqual(t.ok({ s: 'string', n: 42 }))
		})

		it('should reject invalid field value', () => {
			expect(t.decode(tStruct, { s: 'string', n: '42', b: true })).toBeErr()
		})

		it('should reject missing field', () => {
			expect(t.decode(tStruct, { s: 'string', b: true })).toBeErr()
		})

		it('should reject extra field', () => {
			expect(t.decode(tStruct, { s: 'string', n: 42, b: true, e: 'extra' })).toBeErr()
		})

		it('should accept extra field with opt', () => {
			expect(
				t.decode(
					tStruct,
					{ s: 'string', n: 42, b: true, e: 'extra' },
					{ unknownFields: 'discard' }
				)
			).toEqual(t.ok({ s: 'string', n: 42, b: true, e: 'extra' }))
		})

		it('should drop extra field with opt', () => {
			expect(
				t.decode(
					tStruct,
					{ s: 'string', n: 42, b: true, e: 'extra' },
					{ unknownFields: 'drop' }
				)
			).toEqual(t.ok({ s: 'string', n: 42, b: true }))
		})
	})

	describe('test partial struct decode', () => {
		it('should accept partial struct', () => {
			expect(t.decode(tPartial, { s: 'string' })).toEqual(t.ok({ s: 'string' }))
		})
		it('should reject extra field', () => {
			expect(t.decode(tPartial, { s: 'string', e: 'extra' })).toBeErr()
		})
	})

	describe('test patch struct decode', () => {
		it('should accept optional with null', () => {
			expect(t.decode(tPatch, { s: 'string', b: null })).toEqual(
				t.ok({ s: 'string', b: null })
			)
		})
		it('should accept non-optional with optional', () => {
			expect(t.decode(tPatch, {})).toEqual(t.ok({}))
		})
		it('should reject null in non-optional field', () => {
			expect(t.decode(tPartial, { s: null })).toBeErr()
		})
		it('should print patch type', () => {
			expect(tPatch.print()).toBe(
				'{ s?: string | undefined, n?: number | undefined, b?: boolean | undefined | null }'
			)
		})
		it('should treat a defaulted field as required, not optional', () => {
			const tDef = t.patch(t.struct({ n: t.withDefault(t.number, 7) }))
			expect(t.decode(tDef, { n: null })).toBeErr()
			expect(t.decode(tDef, {})).toEqual(t.ok({}))
			expect(t.decode(tDef, { n: 3 })).toEqual(t.ok({ n: 3 }))
		})
	})

	describe('test pick() constructor', () => {
		it('should create a pick constructor', () => {
			const tPick = t.pick(tStruct, ['s', 'n'])
			expect(tPick.print()).toBe('{ s: string, n: number }')
		})
		it('should accept', () => {
			const tPick = t.pick(tStruct, ['s', 'n'])
			expect(t.decode(tPick, { s: 'string', n: 42 })).toEqual(t.ok({ s: 'string', n: 42 }))
		})
		it('should reject extra field', () => {
			const tPick = t.pick(tStruct, ['s', 'n'])
			expect(t.decode(tPick, { s: 'string', n: 42, b: true })).toBeErr()
		})
	})

	describe('test omit() constructor', () => {
		it('should create an omit constructor', () => {
			const tOmit = t.omit(tStruct, ['s', 'n'])
			expect(tOmit.print()).toBe('{ b?: boolean | undefined }')
		})
		it('should accept', () => {
			const tOmit = t.omit(tStruct, ['s', 'n'])
			expect(t.decode(tOmit, { b: true })).toEqual(t.ok({ b: true }))
		})
		it('should reject extra field', () => {
			const tOmit = t.omit(tStruct, ['s', 'n'])
			expect(t.decode(tOmit, { s: 'string', n: 42, b: true })).toBeErr()
		})
	})

	it('should ignore inherited enumerable properties', () => {
		const o: { [k: string]: unknown } = Object.create({ inherited: 1 })
		o.a = 'x'
		expect(t.decode(t.struct({ a: t.string }), o)).toEqual(t.ok({ a: 'x' }))
		expect(t.decode(t.struct({ a: t.string }), o, { unknownFields: 'discard' })).toEqual(
			t.ok({ a: 'x' })
		)
	})
})

describe('test deepPartial', () => {
	// Nested struct
	const tNested = t.struct({
		name: t.string,
		address: t.struct({
			street: t.string,
			city: t.string,
			zip: t.optional(t.string)
		})
	})

	const tDeepPartial = t.deepPartial(tNested)
	type DeepPartialNested = t.TypeOf<typeof tDeepPartial>

	// Compile time type inference tests
	const dp1: DeepPartialNested = {}
	const dp2: DeepPartialNested = { name: 'John' }
	const dp3: DeepPartialNested = { address: {} }
	const dp4: DeepPartialNested = { address: { city: 'NYC' } }
	const dp5: DeepPartialNested = {
		name: 'John',
		address: { street: '123 Main', city: 'NYC', zip: '10001' }
	}

	describe('basic nested struct', () => {
		it('should accept empty object', () => {
			expect(t.decode(tDeepPartial, {})).toEqual(t.ok({}))
		})

		it('should accept partial top-level', () => {
			expect(t.decode(tDeepPartial, { name: 'John' })).toEqual(t.ok({ name: 'John' }))
		})

		it('should accept empty nested object', () => {
			expect(t.decode(tDeepPartial, { address: {} })).toEqual(t.ok({ address: {} }))
		})

		it('should accept partial nested object', () => {
			expect(t.decode(tDeepPartial, { address: { city: 'NYC' } })).toEqual(
				t.ok({ address: { city: 'NYC' } })
			)
		})

		it('should accept full object', () => {
			expect(
				t.decode(tDeepPartial, {
					name: 'John',
					address: { street: '123 Main', city: 'NYC', zip: '10001' }
				})
			).toEqual(
				t.ok({
					name: 'John',
					address: { street: '123 Main', city: 'NYC', zip: '10001' }
				})
			)
		})

		it('should reject extra field at top level', () => {
			expect(t.decode(tDeepPartial, { name: 'John', extra: true })).toBeErr()
		})

		it('should reject extra field in nested object', () => {
			expect(t.decode(tDeepPartial, { address: { city: 'NYC', extra: true } })).toBeErr()
		})

		it('should print correct type signature', () => {
			expect(tDeepPartial.print()).toBe(
				'{ name?: string | undefined, address?: { street?: string | undefined, city?: string | undefined, zip?: string | undefined } | undefined }'
			)
		})
	})

	describe('with optional wrapper around struct', () => {
		const tWithOptional = t.struct({
			data: t.optional(
				t.struct({
					value: t.number,
					label: t.string
				})
			)
		})

		const tDeepPartialOpt = t.deepPartial(tWithOptional)

		it('should handle optional nested struct', () => {
			expect(t.decode(tDeepPartialOpt, { data: { value: 42 } })).toEqual(
				t.ok({ data: { value: 42 } })
			)
		})

		it('should accept empty nested struct inside optional', () => {
			expect(t.decode(tDeepPartialOpt, { data: {} })).toEqual(t.ok({ data: {} }))
		})

		it('should accept undefined for optional wrapper', () => {
			expect(t.decode(tDeepPartialOpt, { data: undefined })).toEqual(
				t.ok({ data: undefined })
			)
		})

		it('should accept empty object', () => {
			expect(t.decode(tDeepPartialOpt, {})).toEqual(t.ok({}))
		})
	})

	describe('with nullable wrapper around struct', () => {
		const tWithNullable = t.struct({
			data: t.nullable(
				t.struct({
					value: t.number
				})
			)
		})

		const tDeepPartialNull = t.deepPartial(tWithNullable)

		it('should accept null for nullable field', () => {
			expect(t.decode(tDeepPartialNull, { data: null })).toEqual(t.ok({ data: null }))
		})

		it('should accept partial nested struct inside nullable', () => {
			expect(t.decode(tDeepPartialNull, { data: {} })).toEqual(t.ok({ data: {} }))
		})
	})

	describe('with arrays (should NOT recurse)', () => {
		const tWithArray = t.struct({
			items: t.array(
				t.struct({
					id: t.number,
					name: t.string
				})
			)
		})

		const tDeepPartialArray = t.deepPartial(tWithArray)

		it('should NOT make array element fields optional', () => {
			// Array elements should still require all fields
			expect(t.decode(tDeepPartialArray, { items: [{ id: 1 }] })).toBeErr()
		})

		it('should make the array field itself optional', () => {
			expect(t.decode(tDeepPartialArray, {})).toEqual(t.ok({}))
		})

		it('should accept valid array', () => {
			expect(t.decode(tDeepPartialArray, { items: [{ id: 1, name: 'test' }] })).toEqual(
				t.ok({ items: [{ id: 1, name: 'test' }] })
			)
		})
	})

	describe('deep nesting (3+ levels)', () => {
		const tDeep = t.struct({
			l1: t.struct({
				l2: t.struct({
					l3: t.struct({
						value: t.string
					})
				})
			})
		})

		const tDeepPartialDeep = t.deepPartial(tDeep)

		it('should handle deeply nested partials', () => {
			expect(
				t.decode(tDeepPartialDeep, {
					l1: { l2: { l3: {} } }
				})
			).toEqual(
				t.ok({
					l1: { l2: { l3: {} } }
				})
			)
		})

		it('should accept partial at any level', () => {
			expect(t.decode(tDeepPartialDeep, { l1: { l2: {} } })).toEqual(t.ok({ l1: { l2: {} } }))
		})
	})

	describe('with nested optional structs (deep recursion)', () => {
		const tNestedOptional = t.struct({
			l1: t.optional(
				t.struct({
					l2: t.optional(
						t.struct({
							value: t.string
						})
					)
				})
			)
		})

		const tDeepPartialNestedOpt = t.deepPartial(tNestedOptional)

		it('should accept empty object', () => {
			expect(t.decode(tDeepPartialNestedOpt, {})).toEqual(t.ok({}))
		})

		it('should accept undefined at first optional level', () => {
			expect(t.decode(tDeepPartialNestedOpt, { l1: undefined })).toEqual(
				t.ok({ l1: undefined })
			)
		})

		it('should accept empty struct inside first optional', () => {
			expect(t.decode(tDeepPartialNestedOpt, { l1: {} })).toEqual(t.ok({ l1: {} }))
		})

		it('should accept undefined at second optional level', () => {
			expect(t.decode(tDeepPartialNestedOpt, { l1: { l2: undefined } })).toEqual(
				t.ok({ l1: { l2: undefined } })
			)
		})

		it('should accept empty struct inside second optional', () => {
			expect(t.decode(tDeepPartialNestedOpt, { l1: { l2: {} } })).toEqual(
				t.ok({ l1: { l2: {} } })
			)
		})

		it('should make innermost field optional via recursion', () => {
			// The 'value' field should be optional after deep recursion
			expect(t.decode(tDeepPartialNestedOpt, { l1: { l2: { value: 'test' } } })).toEqual(
				t.ok({ l1: { l2: { value: 'test' } } })
			)
		})

		it('should reject null where only undefined is allowed', () => {
			expect(t.decode(tDeepPartialNestedOpt, { l1: null })).toBeErr()
		})
	})

	describe('with mixed required/optional deep nesting', () => {
		const tMixed = t.struct({
			required: t.struct({
				middle: t.optional(
					t.struct({
						inner: t.struct({
							value: t.string
						})
					})
				)
			})
		})

		const tDeepPartialMixed = t.deepPartial(tMixed)

		it('should accept empty object', () => {
			expect(t.decode(tDeepPartialMixed, {})).toEqual(t.ok({}))
		})

		it('should accept empty required struct', () => {
			expect(t.decode(tDeepPartialMixed, { required: {} })).toEqual(t.ok({ required: {} }))
		})

		it('should accept undefined for middle optional', () => {
			expect(t.decode(tDeepPartialMixed, { required: { middle: undefined } })).toEqual(
				t.ok({ required: { middle: undefined } })
			)
		})

		it('should recurse through optional into inner required struct', () => {
			expect(t.decode(tDeepPartialMixed, { required: { middle: { inner: {} } } })).toEqual(
				t.ok({ required: { middle: { inner: {} } } })
			)
		})

		it('should make deeply nested value optional', () => {
			expect(
				t.decode(tDeepPartialMixed, { required: { middle: { inner: { value: 'test' } } } })
			).toEqual(t.ok({ required: { middle: { inner: { value: 'test' } } } }))
		})
	})

	describe('with withDefault fields', () => {
		const tWithDefault = t.struct({ n: t.withDefault(t.number, 7), s: t.string })
		const tNestedDefault = t.struct({
			d: t.withDefault(t.struct({ a: t.string, b: t.number }), () => ({ a: 'x', b: 1 })),
			s: t.string
		})

		it('should keep the default value, like partial()', () => {
			expect(t.decode(t.deepPartial(tWithDefault), { s: 'x' })).toEqual(
				t.ok({ n: 7, s: 'x' })
			)
			expect(t.decode(t.partial(tWithDefault), { s: 'x' })).toEqual(t.ok({ n: 7, s: 'x' }))
		})

		it('should recurse into a struct wrapped in withDefault()', () => {
			expect(t.decode(t.deepPartial(tNestedDefault), { s: 'x', d: { a: 'y' } })).toEqual(
				t.ok({ s: 'x', d: { a: 'y' } })
			)
		})

		it('should keep a nested default value', () => {
			expect(t.decode(t.deepPartial(tNestedDefault), { s: 'x' })).toEqual(
				t.ok({ s: 'x', d: { a: 'x', b: 1 } })
			)
		})
	})
})

describe('test deepPatch', () => {
	const tNested = t.struct({
		name: t.string,
		age: t.optional(t.number),
		address: t.struct({
			street: t.string,
			city: t.string
		})
	})

	const tDeepPatch = t.deepPatch(tNested)
	type DeepPatchNested = t.TypeOf<typeof tDeepPatch>

	// Compile time type inference tests
	const dpatch1: DeepPatchNested = {}
	const dpatch2: DeepPatchNested = { name: 'John' }
	const dpatch3: DeepPatchNested = { age: null } // Optional field can be null
	const dpatch4: DeepPatchNested = { address: { city: 'LA' } }

	describe('basic nested struct', () => {
		it('should accept empty object', () => {
			expect(t.decode(tDeepPatch, {})).toEqual(t.ok({}))
		})

		it('should accept null for optional fields (to clear)', () => {
			expect(t.decode(tDeepPatch, { age: null })).toEqual(t.ok({ age: null }))
		})

		it('should reject null for required fields', () => {
			expect(t.decode(tDeepPatch, { name: null })).toBeErr()
		})

		it('should accept partial nested struct', () => {
			expect(t.decode(tDeepPatch, { address: { city: 'LA' } })).toEqual(
				t.ok({ address: { city: 'LA' } })
			)
		})

		it('should allow omitting required fields', () => {
			expect(t.decode(tDeepPatch, {})).toEqual(t.ok({}))
		})

		it('should accept undefined for nested struct field', () => {
			expect(t.decode(tDeepPatch, { address: undefined })).toEqual(
				t.ok({ address: undefined })
			)
		})
	})

	describe('with optional wrapper around struct', () => {
		const tWithOptional = t.struct({
			data: t.optional(
				t.struct({
					required: t.string,
					opt: t.optional(t.number)
				})
			)
		})

		const tDeepPatchOpt = t.deepPatch(tWithOptional)

		it('should accept null for optional wrapper (to clear entire field)', () => {
			expect(t.decode(tDeepPatchOpt, { data: null })).toEqual(t.ok({ data: null }))
		})

		it('should accept partial inner struct', () => {
			expect(t.decode(tDeepPatchOpt, { data: { opt: null } })).toEqual(
				t.ok({ data: { opt: null } })
			)
		})

		it('should reject null for required inner field', () => {
			expect(t.decode(tDeepPatchOpt, { data: { required: null } })).toBeErr()
		})
	})

	describe('deep nesting', () => {
		const tDeep = t.struct({
			l1: t.struct({
				value: t.string,
				opt: t.optional(t.number),
				l2: t.struct({
					value: t.string
				})
			})
		})

		const tDeepPatchDeep = t.deepPatch(tDeep)

		it('should apply patch semantics at all levels', () => {
			expect(
				t.decode(tDeepPatchDeep, {
					l1: { opt: null, l2: {} }
				})
			).toEqual(
				t.ok({
					l1: { opt: null, l2: {} }
				})
			)
		})
	})

	describe('with nested optional structs (deep recursion)', () => {
		const tNestedOptional = t.struct({
			l1: t.optional(
				t.struct({
					l2: t.optional(
						t.struct({
							value: t.string
						})
					)
				})
			)
		})

		const tDeepPatchNestedOpt = t.deepPatch(tNestedOptional)

		it('should accept empty object', () => {
			expect(t.decode(tDeepPatchNestedOpt, {})).toEqual(t.ok({}))
		})

		it('should accept null at first optional level (to clear)', () => {
			expect(t.decode(tDeepPatchNestedOpt, { l1: null })).toEqual(t.ok({ l1: null }))
		})

		it('should accept null at second optional level (to clear)', () => {
			expect(t.decode(tDeepPatchNestedOpt, { l1: { l2: null } })).toEqual(
				t.ok({ l1: { l2: null } })
			)
		})

		it('should accept empty nested struct', () => {
			expect(t.decode(tDeepPatchNestedOpt, { l1: { l2: {} } })).toEqual(
				t.ok({ l1: { l2: {} } })
			)
		})

		it('should make innermost field optional via recursion', () => {
			expect(t.decode(tDeepPatchNestedOpt, { l1: { l2: { value: 'test' } } })).toEqual(
				t.ok({ l1: { l2: { value: 'test' } } })
			)
		})

		it('should reject null for innermost required field', () => {
			expect(t.decode(tDeepPatchNestedOpt, { l1: { l2: { value: null } } })).toBeErr()
		})
	})

	describe('with mixed required/optional deep nesting', () => {
		const tMixed = t.struct({
			required: t.struct({
				middle: t.optional(
					t.struct({
						innerReq: t.string,
						innerOpt: t.optional(t.number)
					})
				)
			})
		})

		const tDeepPatchMixed = t.deepPatch(tMixed)
		type DeepPatchMixed = t.TypeOf<typeof tDeepPatchMixed>
		const dpm: DeepPatchMixed = { required: { middle: { innerOpt: null } } }

		it('should accept null for middle optional (to clear)', () => {
			expect(t.decode(tDeepPatchMixed, { required: { middle: null } })).toEqual(
				t.ok({ required: { middle: null } })
			)
		})

		it('should accept null for deeply nested optional field', () => {
			expect(t.decode(tDeepPatchMixed, { required: { middle: { innerOpt: null } } })).toEqual(
				t.ok({ required: { middle: { innerOpt: null } } })
			)
		})

		it('should reject null for deeply nested required field', () => {
			expect(
				t.decode(tDeepPatchMixed, { required: { middle: { innerReq: null } } })
			).toBeErr()
		})

		it('should accept partial patch at any level', () => {
			expect(
				t.decode(tDeepPatchMixed, { required: { middle: { innerReq: 'updated' } } })
			).toEqual(t.ok({ required: { middle: { innerReq: 'updated' } } }))
		})
	})

	describe('with withDefault fields', () => {
		const tNestedDefault = t.deepPatch(
			t.struct({
				d: t.withDefault(t.struct({ a: t.string, b: t.number }), () => ({ a: 'x', b: 1 }))
			})
		)

		it('should make nested fields optional', () => {
			expect(t.decode(tNestedDefault, { d: { a: 'y' } })).toEqual(t.ok({ d: { a: 'y' } }))
		})

		it('should accept an empty patch', () => {
			expect(t.decode(tNestedDefault, {})).toEqual(t.ok({}))
		})

		it('should treat a defaulted field as required, not optional', () => {
			const tScalarDefault = t.deepPatch(t.struct({ n: t.withDefault(t.number, 7) }))
			expect(t.decode(tScalarDefault, { n: null })).toBeErr()
			expect(t.decode(tScalarDefault, {})).toEqual(t.ok({}))
			expect(t.decode(tScalarDefault, { n: 3 })).toEqual(t.ok({ n: 3 }))
		})
	})

	describe('print output', () => {
		it('should print correct type signature', () => {
			const print = tDeepPatch.print()
			expect(print).toContain('name?: string | undefined')
			expect(print).toContain('age?: number | null | undefined')
			expect(print).toContain('address?:')
		})
	})
})

describe('deepPartial/deepPatch with lazy fields', () => {
	const tInner = t.struct({ a: t.string, b: t.number })

	it('should recurse into an unresolved lazy()', () => {
		const tLazy = t.struct({ l: t.lazy(() => tInner) })
		expect(t.decode(t.deepPartial(tLazy), { l: { a: 'x' } })).toEqual(t.ok({ l: { a: 'x' } }))
		expect(t.decode(t.deepPatch(tLazy), { l: { a: 'x' } })).toEqual(t.ok({ l: { a: 'x' } }))
		expect(t.decode(t.deepPartial(tLazy), { l: { a: 'x', b: 1 } })).toEqual(
			t.ok({ l: { a: 'x', b: 1 } })
		)
	})

	it('should behave the same for an already-resolved lazy()', () => {
		const tl = t.lazy(() => tInner)
		// force resolution: this used to change what deepPartial()/deepPatch() produced
		expect(t.decode(tl, { a: 'x', b: 1 })).toEqual(t.ok({ a: 'x', b: 1 }))
		const tLazy = t.struct({ l: tl })
		expect(t.decode(t.deepPartial(tLazy), { l: { a: 'x' } })).toEqual(t.ok({ l: { a: 'x' } }))
		expect(t.decode(t.deepPatch(tLazy), { l: { a: 'x' } })).toEqual(t.ok({ l: { a: 'x' } }))
	})

	it('should close the cycle per call, not globally', () => {
		let tNode: t.Type<unknown>
		tNode = t.lazy(() => t.struct({ v: t.number, child: t.optional(tNode) }) as t.Type<unknown>)
		const tSrc = t.struct({ root: tNode })
		const tA = t.deepPartial(tSrc)
		const tB = t.deepPartial(tSrc)
		expect(t.decode(tA, { root: { child: { child: {} } } })).toEqual(
			t.ok({ root: { child: { child: {} } } })
		)
		expect(t.decode(tB, { root: { child: { child: {} } } })).toEqual(
			t.ok({ root: { child: { child: {} } } })
		)
	})

	it('should terminate on a self-referential lazy()', () => {
		let tNode: t.Type<unknown>
		tNode = t.lazy(() => t.struct({ v: t.number, child: t.optional(tNode) }) as t.Type<unknown>)
		const tDeep = t.deepPartial(t.struct({ root: tNode }))
		expect(t.decode(tDeep, { root: { child: {} } })).toEqual(t.ok({ root: { child: {} } }))
	})
})

describe('deepPartial/deepPatch with record, union and taggedUnion fields', () => {
	const tInner = t.struct({ a: t.string, b: t.number })

	it('should recurse into record() values', () => {
		const tRec = t.struct({ r: t.record(tInner) })
		expect(t.decode(t.deepPartial(tRec), { r: { k: { a: 'x' } } })).toEqual(
			t.ok({ r: { k: { a: 'x' } } })
		)
		expect(t.decode(t.deepPatch(tRec), { r: { k: { a: 'x' } } })).toEqual(
			t.ok({ r: { k: { a: 'x' } } })
		)
	})

	it('should recurse into every union() member', () => {
		const tUni = t.deepPartial(t.struct({ u: t.union(tInner, t.number) }))
		expect(t.decode(tUni, { u: { a: 'x' } })).toEqual(t.ok({ u: { a: 'x' } }))
		expect(t.decode(tUni, { u: 1 })).toEqual(t.ok({ u: 1 }))

		// The inferred type has to follow the runtime into every union member
		type Uni = t.TypeOf<typeof tUni>
		const u1: Uni = { u: { a: 'x' } }
		const u2: Uni = { u: 1 }
		const u3: Uni = {}
		expect([u1, u2, u3].length).toBe(3)
	})

	it('should degrade a taggedUnion() to a plain union()', () => {
		const tTagged = t.struct({
			x: t.taggedUnion('type')({
				a: t.struct({ type: t.literal('a'), v: t.number }),
				b: t.struct({ type: t.literal('b'), w: t.string })
			})
		})
		const tDeep = t.deepPartial(tTagged)
		// The tag is optional now, so a tag-less object matches the first member
		expect(t.decode(tDeep, { x: { v: 1 } })).toEqual(t.ok({ x: { v: 1 } }))
		expect(t.decode(tDeep, { x: { type: 'a' } })).toEqual(t.ok({ x: { type: 'a' } }))
		expect(t.decode(tDeep, { x: { type: 'a', v: 1 } })).toEqual(
			t.ok({ x: { type: 'a', v: 1 } })
		)

		// Same rule at compile time: every field is optional, the tag included
		type Tagged = t.TypeOf<typeof tDeep>
		const g1: Tagged = { x: { type: 'a' } }
		const g2: Tagged = { x: { type: 'b', w: 's' } }
		const g3: Tagged = { x: { v: 1 } }
		expect([g1, g2, g3].length).toBe(3)
	})

	it('should degrade a taggedUnion() to a plain union() in deepPatch() too', () => {
		const tTagged = t.struct({
			x: t.taggedUnion('type')({ a: t.struct({ type: t.literal('a'), v: t.number }) })
		})
		const tDeep = t.deepPatch(tTagged)
		expect(t.decode(tDeep, { x: { v: 1 } })).toEqual(t.ok({ x: { v: 1 } }))
		expect(t.decode(tDeep, { x: { type: 'a' } })).toEqual(t.ok({ x: { type: 'a' } }))
	})

	it('should make a literal field optional', () => {
		const tLit = t.deepPartial(t.struct({ status: t.literal('on', 'off'), name: t.string }))
		expect(t.decode(tLit, {})).toEqual(t.ok({}))
		expect(t.decode(tLit, { status: 'on' })).toEqual(t.ok({ status: 'on' }))
	})

	// The type and the runtime have to agree: an optional literal field was required at
	// runtime while DeepPatchStruct<> made it optional.
	it('should make an optional literal field optional at runtime too', () => {
		const tP = t.deepPatch(t.struct({ kind: t.optional(t.literal('a')), v: t.number }))
		expect(t.decode(tP, {})).toEqual(t.ok({}))
		expect(t.decode(tP, { kind: 'a' })).toEqual(t.ok({ kind: 'a' }))
		type P = t.TypeOf<typeof tP>
		const p: P = {}
		expect(p).toEqual({})
	})

	it('should recurse through a non-struct intersection() field', () => {
		const tInt = t.deepPartial(t.struct({ i: t.intersection(t.string, t.unknown) }))
		expect(t.decode(tInt, { i: 'x' })).toEqual(t.ok({ i: 'x' }))
		expect(t.decode(tInt, {})).toEqual(t.ok({}))
	})
})

// The wrapping only happens at struct-field level, so a wrapper reached through a
// combinator has to be preserved by processType() itself - otherwise the derived patch
// rejects values the source accepted.
it('should keep nullability nested inside record() and union()', () => {
	const tP = t.deepPatch(
		t.struct({
			r: t.record(t.nullable(t.string)),
			u: t.union(t.optional(t.number), t.string)
		})
	)
	expect(t.decode(tP, { r: { k: null } })).toEqual(t.ok({ r: { k: null } }))
	expect(t.decode(tP, { u: 1 })).toEqual(t.ok({ u: 1 }))
	expect(t.decode(tP, { u: 'x' })).toEqual(t.ok({ u: 'x' }))
})

describe('patch() with a nested default', () => {
	it('should strip a default under optional()', () => {
		const tP = t.patch(t.struct({ n: t.optional(t.withDefault(t.number, 7)) }))
		expect(tP.print()).not.toContain('= 7')
		expect(t.decode(tP, {})).toEqual(t.ok({}))
	})
})

describe('struct decode and absent fields', () => {
	const tUser = t.struct({ name: t.string, email: t.string, age: t.number })

	it('should not create own keys for absent optional fields', () => {
		const res = t.decode(t.patch(tUser), { name: 'x' })
		expect(t.isOk(res) && Object.keys(res.ok)).toEqual(['name'])
	})

	it('should keep an explicitly supplied undefined', () => {
		const res = t.decode(t.patch(tUser), { name: 'x', email: undefined })
		expect(t.isOk(res) && Object.keys(res.ok)).toEqual(['name', 'email'])
	})

	it('should let a decoded patch be spread over a stored record', () => {
		const stored = { name: 'old', email: 'a@b', age: 1 }
		const res = t.decode(t.patch(tUser), { name: 'new' })
		expect(t.isOk(res) && { ...stored, ...res.ok }).toEqual({
			name: 'new',
			email: 'a@b',
			age: 1
		})
	})

	it('should not resurrect a prototype key name', () => {
		const res = t.decode(t.patch(t.struct({ toString: t.string })), {})
		expect(t.isOk(res) && Object.keys(res.ok)).toEqual([])
	})
})

describe('deepPartial() lazy cache', () => {
	it('should map a self-referential lazy() to one struct instance', () => {
		let tNode: t.Type<unknown>
		tNode = t.lazy(() => t.struct({ v: t.number, child: t.optional(tNode) }) as t.Type<unknown>)
		const tDeep = t.deepPartial(t.struct({ root: tNode }))
		// Decode first: LazyType resolves on demand
		expect(t.decode(tDeep, { root: { child: {} } })).toEqual(t.ok({ root: { child: {} } }))

		// biome-ignore lint/suspicious/noExplicitAny: reaching into the rebuilt graph
		const rootLazy = (tDeep.props.root as any).type
		const level1 = rootLazy.type
		const childLazy = level1.props.child.type
		// One wrapper, and the second level points back at the first level's struct
		expect(childLazy).toBe(rootLazy)
		expect(childLazy.type).toBe(level1)
	})
})

describe('deepPartial() wrapper rebuild', () => {
	it('should not double-wrap optional(nullable(x))', () => {
		const tS = t.struct({ n: t.struct({ x: t.optional(t.nullable(t.string)) }) })
		// biome-ignore lint/suspicious/noExplicitAny: reaching into the rebuilt graph
		const inner = (t.deepPartial(tS).props.n as any).type
		expect(inner.props.x).toBeInstanceOf(t.OptionalType)
		expect(inner.props.x.type).toBeInstanceOf(t.NullableType)
	})
})

describe('union decode error reporting', () => {
	const tTagged = t.taggedUnion('k')({
		a: t.struct({ k: t.literal('a'), v: t.number })
	})

	it('should report the members own reason after a deepPatch() rewrite', () => {
		const res = t.decode(t.deepPatch(t.struct({ x: tTagged })), { x: { k: 'zz' } })
		expect(res).toBeErr('expected "a"')
	})
})

// vim: ts=4
