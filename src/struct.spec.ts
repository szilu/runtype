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

	// These are compile time tests for the TS type inference :)
	const struct1: Struct = { s: 'string', n: 42, b: true }
	const struct2: Struct = { s: 'string', n: 42 }

	// Uncomment these to test TS type inference
	// const struct3: Struct = { s: 'string', n:null }

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
})

// vim: ts=4
