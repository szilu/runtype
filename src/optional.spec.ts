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

	it('should accept 42', () => {
		expect(tOptional.decode(42)).toEqual(t.ok(42))
	})

	it('should accept undefined', () => {
		expect(tOptional.decode(undefined)).toEqual(t.ok(undefined))
	})

	it('should reject "z"', () => {
		expect(tOptional.decode('z')).toBeErr()
	})

	it('should print type', () => {
		expect(tOptional.print()).toBe('number | undefined')
	})
})

// vim: ts=4
