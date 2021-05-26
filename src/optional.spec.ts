import * as t from './index'
import './jest.local.ts'

declare global {
	namespace jest {
		interface Matchers<R> {
			toBeErr(pattern?: string): R;
		}
	}
}

describe('test optional type', () => {
	const tOptional = t.optional(t.number)
	type Optional = t.TypeOf<typeof tOptional>

	// These are compile time tests for the TS type inference :)
	const o1: Optional = 42
	const o2: Optional = undefined

	// Uncomment these to test TS type inference
	//const o3: Optional = 'zizi'
	//const o4: Optional = null

	it('should accept 42', () => {
		expect(t.decode(tOptional, 42)).toEqual(t.ok(42))
	})

	it('should accept undefined', () => {
		expect(t.decode(tOptional, undefined)).toEqual(t.ok(undefined))
	})

	it('should reject "z"', () => {
		expect(t.decode(tOptional, 'z')).toBeErr()
	})

	it('should print type', () => {
		expect(tOptional.print()).toBe('number | undefined')
	})
})

// vim: ts=4
