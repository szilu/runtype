import * as t from './index'
import './jest.local.ts'

declare global {
	namespace jest {
		interface Matchers<R> {
			toBeErr(pattern?: string): R;
		}
	}
}

describe('test intersection type', () => {
	const tIntersect = t.intersection(t.boolean, t.trueValue)
	type Intersect = t.TypeOf<typeof tIntersect>

	// Struct
	const tStruct1 = t.struct({
		s: t.string,
		n: t.number,
		b: t.optional(t.boolean)
	})
	const tStruct2 = t.struct({
		s: t.string,
		n2: t.number
	})

	const tIntersectStruct = t.intersection(tStruct1, tStruct2)
	type IntersectStruct = t.TypeOf<typeof tIntersectStruct>


	// These are compile time tests for the TS type inference :)
	const b1: Intersect = true
	const s1: IntersectStruct = { s: 'string', n: 42, b: true, n2: 21 }
	const s2: IntersectStruct = { s: 'string', n: 42, n2: 21 }

	// Uncomment these to test TS type inference
	//const bE1: Intersect = false
	//const sE1: IntersectStruct = { s: 'string', n: 42, n2: 21, z: 23 }

	describe('test scalar decode', () => {
		it('should accept struct', () => {
			expect(t.decode(tIntersect, true)).toEqual(t.ok(true))
		})
		it('should reject invalid field value', () => {
			expect(t.decode(tIntersect, false)).toBeErr()
		})
		it('should reject invalid field value 2', () => {
			expect(t.decode(t.intersection(t.trueValue, t.boolean), false)).toBeErr()
		})
	})

	describe('test struct decode', () => {
		it('should accept struct', () => {
			expect(t.decode(tIntersectStruct, { s: 'string', n: 42, b: true, n2: 21 })).toEqual(t.ok({ s: 'string', n: 42, b: true, n2: 21 }))
		})

		it('should reject invalid field value', () => {
			expect(t.decode(tIntersectStruct, { s: 'string', n: '42', b: true, n2: 21 })).toBeErr()
		})

		it('should reject missing field', () => {
			expect(t.decode(tIntersectStruct, { s: 'string', b: true })).toBeErr()
		})

		it('should reject extra field', () => {
			expect(t.decode(tIntersectStruct, { s: 'string', n: 42, b: true, n2: 21, e: 'extra' })).toBeErr()
		})

		it('should accept extra field with opt', () => {
			expect(t.decode(tIntersectStruct, { s: 'string', n: 42, b: true, n2: 21, e: 'extra' }, { unknownFields: 'discard' })).toEqual(t.ok({ s: 'string', n: 42, b: true, n2: 21, e: 'extra' }))
		})

		it('should drop extra field with opt', () => {
			expect(t.decode(tIntersectStruct, { s: 'string', n: 42, b: true, n2: 21, e: 'extra' }, { unknownFields: 'drop' })).toEqual(t.ok({ s: 'string', n: 42, b: true, n2: 21 }))
		})

		it('should print type', () => {
			expect(tIntersectStruct.print()).toBe('{ s: string, n: number, b?: boolean | undefined } & { s: string, n2: number }')
		})
	})
})

// vim: ts=4
