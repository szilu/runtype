import * as t from './index.js'
import './jest.local.js'

declare global {
	namespace jest {
		interface Matchers<R> {
			toBeErr(pattern?: string): R;
		}
	}
}

describe('test nullable type', () => {
	const tNullable = t.nullable(t.number)

	it('should accept 42', () => {
		expect(t.decode(tNullable, 42)).toEqual(t.ok(42))
	})

	it('should accept null', () => {
		expect(t.decode(tNullable, null)).toEqual(t.ok(null))
	})

	it('should accept undefined', () => {
		expect(t.decode(tNullable, undefined)).toEqual(t.ok(undefined))
	})

	it('should reject "z"', () => {
		expect(t.decode(tNullable, 'z')).toBeErr()
	})

	it('should print type', () => {
		expect(tNullable.print()).toBe('number | null | undefined')
	})
})

// vim: ts=4
