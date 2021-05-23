import * as t from './index'
import './jest.local.ts'

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
	type PartialStruct = t.PartialTypeOf<typeof tStruct>
	type PatchStruct = t.PatchTypeOf<typeof tStruct>

	// These are compile time tests for the TS type inference :)
	const struct1: Struct = { s: 'string', n: 42, b: true }
	const struct2: Struct = { s: 'string', n: 42 }
	const partialStruct: PartialStruct = { s: 'string', n: 42, b: undefined }
	const patchStruct1: PatchStruct = { s: 'string', n: 42, b: null }
	const patchStruct2: PatchStruct = { s: 'string' }

	// Uncomment these to test TS type inference
	// const patchStruct3: PatchStruct = { s: 'string', n:null }

	describe('test struct decode', () => {
		it('should accept struct', () => {
			expect(tStruct.decode({ s: 'string', n: 42, b: true })).toEqual(t.ok({ s: 'string', n: 42, b: true }))
		})

		it('should reject scalar', () => {
			expect(tStruct.decode(42)).toBeErr()
		})

		it('should reject null', () => {
			expect(tStruct.decode(null)).toBeErr()
		})

		it('should reject array', () => {
			expect(tStruct.decode([42])).toBeErr()
		})

		it('should reject invalid field value', () => {
			expect(tStruct.decode({ s: 'string', n: '42', b: true })).toBeErr()
		})

		it('should reject missing field', () => {
			expect(tStruct.decode({ s: 'string', b: true })).toBeErr()
		})

		it('should reject extra field', () => {
			expect(tStruct.decode({ s: 'string', n: 42, b: true, e: 'extra' })).toBeErr()
		})
	})
	describe('test struct partialDecode', () => {
		it('should accept struct', () => {
			expect(tStruct.decodePartial({ s: 'string', n: 42, b: true })).toEqual(t.ok({ s: 'string', n: 42, b: true }))
		})

		it('should reject null', () => {
			expect(tStruct.decodePartial(null)).toBeErr()
		})

		it('should reject invalid field value', () => {
			expect(tStruct.decodePartial({ s: 'string', n: '42', b: true })).toBeErr()
		})

		it('should accept missing field', () => {
			expect(tStruct.decodePartial({ s: 'string', n: 42 })).toEqual(t.ok({ s: 'string', n: 42 }))
		})

		it('should reject null field', () => {
			expect(tStruct.decodePartial({ s: 'string', n: 42, b: null })).toBeErr()
		})

		it('should reject extra field', () => {
			expect(tStruct.decodePartial({ s: 'string', n: 42, b: true, e: 'extra' })).toBeErr()
		})
	})
	describe('test struct patchDecode', () => {
		it('should accept struct', () => {
			expect(tStruct.decodePatch({ s: 'string', n: 42, b: true })).toEqual(t.ok({ s: 'string', n: 42, b: true }))
		})

		it('should reject null', () => {
			expect(tStruct.decodePatch(null)).toBeErr()
		})

		it('should reject invalid field value', () => {
			expect(tStruct.decodePatch({ s: 'string', n: '42', b: true })).toBeErr()
		})

		it('should accept missing fields', () => {
			expect(tStruct.decodePatch({ s: 'string' })).toEqual(t.ok({ s: 'string' }))
		})

		it('should accept null field', () => {
			expect(tStruct.decodePatch({ s: 'string', n: 42, b: null })).toEqual(t.ok({ s: 'string', n: 42, b: null }))
		})

		it('should reject null in required field', () => {
			expect(tStruct.decodePatch({ s: 'string', n: null, b: true })).toBeErr()
		})

		it('should reject extra field', () => {
			expect(tStruct.decodePatch({ s: 'string', n: 42, b: true, e: 'extra' })).toBeErr()
		})
	})
})


// vim: ts=4
