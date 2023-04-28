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
})

// vim: ts=4
