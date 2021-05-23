import * as t from './index'
import './jest.local.ts'

declare global {
	namespace jest {
		interface Matchers<R> {
			toBeErr(pattern?: string): R;
		}
	}
}

describe('test basic types', () => {
	describe('test constant types', () => {
		it('"undefined" should accept undefined', () => {
			expect(t.undefinedValue.decode(undefined)).toEqual(t.ok(undefined))
		})

		it('"undefined" should reject null', () => {
			expect(t.undefinedValue.decode(null)).toBeErr()
		})

		it('"undefined" should reject 42', () => {
			expect(t.undefinedValue.decode(42)).toBeErr()
		})

		it('"null" should accept null', () => {
			expect(t.nullValue.decode(null)).toEqual(t.ok(null))
		})

		it('"null" should reject undefined', () => {
			expect(t.nullValue.decode(undefined)).toBeErr()
		})

		it('"null" should reject 42', () => {
			expect(t.nullValue.decode(42)).toBeErr()
		})

		it('should print type', () => {
			expect(t.undefinedValue.print()).toBe('undefined')
		})

		it('should print type', () => {
			expect(t.nullValue.print()).toBe('null')
		})
	})

	describe('test string type', () => {
		it('should accept a string', () => {
			expect(t.string.decode('some string')).toEqual(t.ok('some string'))
		})

		it('should reject not string', () => {
			expect(t.string.decode(42)).toBeErr()
		})

		it('should reject undefined', () => {
			expect(t.string.decode(undefined)).toBeErr()
		})

		it('should print type', () => {
			expect(t.string.print()).toBe('string')
		})
	})

	describe('test number type', () => {
		it('should accept a number', () => {
			expect(t.number.decode(42)).toEqual(t.ok(42))
		})

		it('should reject not number', () => {
			expect(t.number.decode(null)).toBeErr()
		})

		it('should reject NaN', () => {
			expect(t.number.decode(NaN)).toBeErr()
		})

		it('should reject undefined', () => {
			expect(t.number.decode(undefined)).toBeErr()
		})

		it('should print type', () => {
			expect(t.number.print()).toBe('number')
		})
	})

	describe('test integer type', () => {
		it('should accept an integer', () => {
			expect(t.integer.decode(42)).toEqual(t.ok(42))
		})

		it('should reject 42.3', () => {
			expect(t.integer.decode(42.3)).toBeErr()
		})

		it('should reject NaN', () => {
			expect(t.integer.decode(NaN)).toBeErr()
		})

		it('should reject undefined', () => {
			expect(t.integer.decode(undefined)).toBeErr()
		})

		it('should print type', () => {
			expect(t.integer.print()).toBe('integer')
		})
	})

	describe('test boolean type', () => {
		it('should accept true', () => {
			expect(t.boolean.decode(true)).toEqual(t.ok(true))
		})

		it('should accept false', () => {
			expect(t.boolean.decode(false)).toEqual(t.ok(false))
		})

		it('should reject not boolean', () => {
			expect(t.boolean.decode(0)).toBeErr()
		})

		it('should reject undefined', () => {
			expect(t.boolean.decode(undefined)).toBeErr()
		})

		it('should print type', () => {
			expect(t.boolean.print()).toBe('boolean')
		})
	})

	describe('test date type', () => {
		it('should accept 0', () => {
			expect(t.date.decode(0)).toEqual(t.ok(new Date(0)))
		})

		it('should accept Date', () => {
			const d = new Date()
			expect(t.date.decode(d)).toEqual(t.ok(d))
		})

		it('should reject not date', () => {
			expect(t.date.decode('XX')).toBeErr()
		})

		it('should reject undefined', () => {
			expect(t.date.decode(undefined)).toBeErr()
		})

		it('should print type', () => {
			expect(t.date.print()).toBe('Date')
		})
	})

	describe('test literal type', () => {
		const tLiteral = t.literal(true, 1, 2, 'a', 'b')

		it('should accept true', () => {
			expect(tLiteral.decode(true)).toEqual(t.ok(true))
		})

		it('should accept 2', () => {
			expect(tLiteral.decode(2)).toEqual(t.ok(2))
		})

		it('should accept "a"', () => {
			expect(tLiteral.decode('a')).toEqual(t.ok('a'))
		})

		it('should reject false', () => {
			expect(tLiteral.decode(false)).toBeErr()
		})

		it('should reject 3', () => {
			expect(tLiteral.decode(3)).toBeErr()
		})

		it('should reject "z"', () => {
			expect(tLiteral.decode('z')).toBeErr()
		})

		it('should reject undefined', () => {
			expect(tLiteral.decode(undefined)).toBeErr()
		})

		it('should print type', () => {
			expect(tLiteral.print()).toBe('true | 1 | 2 | "a" | "b"')
		})
	})
})

// vim: ts=4
