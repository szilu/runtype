import * as t from './index.js'
import './jest.local.js'

declare global {
	namespace jest {
		interface Matchers<R> {
			toBeErr(pattern?: string): R;
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
			expect(t.decode(tStruct, { s: 'string', n: 42, b: true })).toEqual(t.ok({ s: 'string', n: 42, b: true }))
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
			expect(t.decode(tStruct, { s: 'string', n: 42, b: true, e: 'extra' }, { unknownFields: 'discard' })).toEqual(t.ok({ s: 'string', n: 42, b: true, e: 'extra' }))
		})

		it('should drop extra field with opt', () => {
			expect(t.decode(tStruct, { s: 'string', n: 42, b: true, e: 'extra' }, { unknownFields: 'drop' })).toEqual(t.ok({ s: 'string', n: 42, b: true }))
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
			expect(t.decode(tPatch, { s: 'string', b: null })).toEqual(t.ok({ s: 'string', b: null }))
		})
		it('should accept non-optional with optional', () => {
			expect(t.decode(tPatch, {})).toEqual(t.ok({}))
		})
		it('should reject null in non-optional field', () => {
			expect(t.decode(tPartial, { s: null })).toBeErr()
		})
		it('should print patch type', () => {
			expect(tPatch.print()).toBe('{ s?: string | undefined, n?: number | undefined, b?: boolean | undefined | null }')
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
	const dp5: DeepPartialNested = { name: 'John', address: { street: '123 Main', city: 'NYC', zip: '10001' } }

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
			expect(t.decode(tDeepPartial, { address: { city: 'NYC' } }))
				.toEqual(t.ok({ address: { city: 'NYC' } }))
		})

		it('should accept full object', () => {
			expect(t.decode(tDeepPartial, {
				name: 'John',
				address: { street: '123 Main', city: 'NYC', zip: '10001' }
			})).toEqual(t.ok({
				name: 'John',
				address: { street: '123 Main', city: 'NYC', zip: '10001' }
			}))
		})

		it('should reject extra field at top level', () => {
			expect(t.decode(tDeepPartial, { name: 'John', extra: true })).toBeErr()
		})

		it('should reject extra field in nested object', () => {
			expect(t.decode(tDeepPartial, { address: { city: 'NYC', extra: true } })).toBeErr()
		})

		it('should print correct type signature', () => {
			expect(tDeepPartial.print()).toBe('{ name?: string | undefined, address?: { street?: string | undefined, city?: string | undefined, zip?: string | undefined } | undefined }')
		})
	})

	describe('with optional wrapper around struct', () => {
		const tWithOptional = t.struct({
			data: t.optional(t.struct({
				value: t.number,
				label: t.string
			}))
		})

		const tDeepPartialOpt = t.deepPartial(tWithOptional)

		it('should handle optional nested struct', () => {
			expect(t.decode(tDeepPartialOpt, { data: { value: 42 } }))
				.toEqual(t.ok({ data: { value: 42 } }))
		})

		it('should accept empty nested struct inside optional', () => {
			expect(t.decode(tDeepPartialOpt, { data: {} }))
				.toEqual(t.ok({ data: {} }))
		})

		it('should accept undefined for optional wrapper', () => {
			expect(t.decode(tDeepPartialOpt, { data: undefined }))
				.toEqual(t.ok({ data: undefined }))
		})

		it('should accept empty object', () => {
			expect(t.decode(tDeepPartialOpt, {}))
				.toEqual(t.ok({}))
		})
	})

	describe('with nullable wrapper around struct', () => {
		const tWithNullable = t.struct({
			data: t.nullable(t.struct({
				value: t.number
			}))
		})

		const tDeepPartialNull = t.deepPartial(tWithNullable)

		it('should accept null for nullable field', () => {
			expect(t.decode(tDeepPartialNull, { data: null }))
				.toEqual(t.ok({ data: null }))
		})

		it('should accept partial nested struct inside nullable', () => {
			expect(t.decode(tDeepPartialNull, { data: {} }))
				.toEqual(t.ok({ data: {} }))
		})
	})

	describe('with arrays (should NOT recurse)', () => {
		const tWithArray = t.struct({
			items: t.array(t.struct({
				id: t.number,
				name: t.string
			}))
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
			expect(t.decode(tDeepPartialArray, { items: [{ id: 1, name: 'test' }] }))
				.toEqual(t.ok({ items: [{ id: 1, name: 'test' }] }))
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
			expect(t.decode(tDeepPartialDeep, {
				l1: { l2: { l3: {} } }
			})).toEqual(t.ok({
				l1: { l2: { l3: {} } }
			}))
		})

		it('should accept partial at any level', () => {
			expect(t.decode(tDeepPartialDeep, { l1: { l2: {} } }))
				.toEqual(t.ok({ l1: { l2: {} } }))
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
	const dpatch3: DeepPatchNested = { age: null }  // Optional field can be null
	const dpatch4: DeepPatchNested = { address: { city: 'LA' } }

	describe('basic nested struct', () => {
		it('should accept empty object', () => {
			expect(t.decode(tDeepPatch, {})).toEqual(t.ok({}))
		})

		it('should accept null for optional fields (to clear)', () => {
			expect(t.decode(tDeepPatch, { age: null }))
				.toEqual(t.ok({ age: null }))
		})

		it('should reject null for required fields', () => {
			expect(t.decode(tDeepPatch, { name: null })).toBeErr()
		})

		it('should accept partial nested struct', () => {
			expect(t.decode(tDeepPatch, { address: { city: 'LA' } }))
				.toEqual(t.ok({ address: { city: 'LA' } }))
		})

		it('should allow omitting required fields', () => {
			expect(t.decode(tDeepPatch, {})).toEqual(t.ok({}))
		})

		it('should accept undefined for nested struct field', () => {
			expect(t.decode(tDeepPatch, { address: undefined }))
				.toEqual(t.ok({ address: undefined }))
		})
	})

	describe('with optional wrapper around struct', () => {
		const tWithOptional = t.struct({
			data: t.optional(t.struct({
				required: t.string,
				opt: t.optional(t.number)
			}))
		})

		const tDeepPatchOpt = t.deepPatch(tWithOptional)

		it('should accept null for optional wrapper (to clear entire field)', () => {
			expect(t.decode(tDeepPatchOpt, { data: null }))
				.toEqual(t.ok({ data: null }))
		})

		it('should accept partial inner struct', () => {
			expect(t.decode(tDeepPatchOpt, { data: { opt: null } }))
				.toEqual(t.ok({ data: { opt: null } }))
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
			expect(t.decode(tDeepPatchDeep, {
				l1: { opt: null, l2: {} }
			})).toEqual(t.ok({
				l1: { opt: null, l2: {} }
			}))
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

// vim: ts=4
