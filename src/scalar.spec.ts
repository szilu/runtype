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
			expect(t.decode(t.undefinedValue, undefined)).toEqual(t.ok(undefined))
		})

		it('"undefined" should reject null', () => {
			expect(t.decode(t.undefinedValue, null)).toBeErr()
		})

		it('"undefined" should reject 42', () => {
			expect(t.decode(t.undefinedValue, 42)).toBeErr()
		})

		it('"null" should accept null', () => {
			expect(t.decode(t.nullValue, null)).toEqual(t.ok(null))
		})

		it('"null" should reject undefined', () => {
			expect(t.decode(t.nullValue, undefined)).toBeErr()
		})

		it('"null" should reject 42', () => {
			expect(t.decode(t.nullValue, 42)).toBeErr()
		})

		it('should print type', () => {
			expect(t.undefinedValue.print()).toBe('undefined')
		})

		it('should print type', () => {
			expect(t.nullValue.print()).toBe('null')
		})
	})

	describe('test any type', () => {
		it('should accept string', () => {
			expect(t.decode(t.any, 'some string')).toEqual(t.ok('some string'))
		})

		it('should accept number', () => {
			expect(t.decode(t.any, 42)).toEqual(t.ok(42))
		})

		it('should accept object', () => {
			expect(t.decode(t.any, {})).toEqual(t.ok({}))
		})

		it('should print type', () => {
			expect(t.any.print()).toBe('any')
		})
	})

	describe('test string type', () => {
		it('should accept a string', () => {
			expect(t.decode(t.string, 'some string')).toEqual(t.ok('some string'))
		})

		it('should reject number', () => {
			expect(t.decode(t.string, 42)).toBeErr()
		})

		it('should coerce number with opt', () => {
			expect(t.decode(t.string, 42, { coerceAll: true })).toEqual(t.ok('42'))
		})

		it('should reject undefined', () => {
			expect(t.decode(t.string, undefined)).toBeErr()
		})

		it('should print type', () => {
			expect(t.string.print()).toBe('string')
		})
	})

	describe('test number type', () => {
		it('should accept a number', () => {
			expect(t.decode(t.number, 42)).toEqual(t.ok(42))
		})

		it('should reject string', () => {
			expect(t.decode(t.number, '42')).toBeErr()
		})

		it('should coerce string with opt', () => {
			expect(t.decode(t.number, '42', { coerceAll: true })).toEqual(t.ok(42))
		})

		it('should reject undefined', () => {
			expect(t.decode(t.number, undefined)).toBeErr()
		})

		it('should reject NaN', () => {
			expect(t.decode(t.number, NaN)).toBeErr()
		})

		it('should accept NaN with opt', () => {
			expect(t.decode(t.number, NaN, { acceptNaN: true })).toEqual(t.ok(NaN))
		})

		it('should print type', () => {
			expect(t.number.print()).toBe('number')
		})
	})

	describe('test integer type', () => {
		it('should accept an integer', () => {
			expect(t.decode(t.integer, 42)).toEqual(t.ok(42))
		})

		it('should reject 42.3', () => {
			expect(t.decode(t.integer, 42.3)).toBeErr()
		})

		it('should reject NaN', () => {
			expect(t.decode(t.integer, NaN)).toBeErr()
		})

		it('should reject undefined', () => {
			expect(t.decode(t.integer, undefined)).toBeErr()
		})

		it('should print type', () => {
			expect(t.integer.print()).toBe('integer')
		})
	})

	describe('test boolean type', () => {
		it('should accept true', () => {
			expect(t.decode(t.boolean, true)).toEqual(t.ok(true))
		})

		it('should accept false', () => {
			expect(t.decode(t.boolean, false)).toEqual(t.ok(false))
		})

		it('should reject number', () => {
			expect(t.decode(t.boolean, 0)).toBeErr()
		})

		it('should coerce 0 with opt', () => {
			expect(t.decode(t.boolean, 0, { coerceAll: true })).toEqual(t.ok(false))
		})

		it('should coerce number != 0 with opt', () => {
			expect(t.decode(t.boolean, 42, { coerceAll: true })).toEqual(t.ok(true))
		})

		it('should reject undefined', () => {
			expect(t.decode(t.boolean, undefined)).toBeErr()
		})

		it('should print type', () => {
			expect(t.boolean.print()).toBe('boolean')
		})
	})

	describe('test Date type', () => {
		it('should accept Date', () => {
			const d = new Date()
			expect(t.decode(t.date, d)).toEqual(t.ok(d))
		})

		it('should reject string', () => {
			expect(t.decode(t.date, 'XX')).toBeErr()
		})

		it('should reject number', () => {
			expect(t.decode(t.date, 0)).toBeErr()
		})

		it('should reject object', () => {
			expect(t.decode(t.date, {})).toBeErr()
		})

		it('should accept number with coercion', () => {
			expect(t.decode(t.date, 0, { coerceDate: true })).toEqual(t.ok(new Date(0)))
		})

		it('should accept string with coercion', () => {
			expect(t.decode(t.date, '2000-01-01', { coerceDate: true })).toEqual(t.ok(new Date('2000-01-01')))
		})

		it('should reject non date string with coercion', () => {
			expect(t.decode(t.date, 'XX', { coerceDate: true })).toBeErr()
		})

		it('should reject undefined', () => {
			expect(t.decode(t.date, undefined)).toBeErr()
		})

		it('should print type', () => {
			expect(t.date.print()).toBe('Date')
		})
	})

	describe('test literal type', () => {
		const tLiteral = t.literal(true, 1, 2, 'a', 'b')
		type Literal = t.TypeOf<typeof tLiteral>

		it('should accept true', () => {
			expect(t.decode(tLiteral, true)).toEqual(t.ok(true))
		})

		it('should accept 2', () => {
			expect(t.decode(tLiteral, 2)).toEqual(t.ok(2))
		})

		it('should accept "a"', () => {
			expect(t.decode(tLiteral, 'a')).toEqual(t.ok('a'))
		})

		it('should reject false', () => {
			expect(t.decode(tLiteral, false)).toBeErr()
		})

		it('should reject 3', () => {
			expect(t.decode(tLiteral, 3)).toBeErr()
		})

		it('should reject "z"', () => {
			expect(t.decode(tLiteral, 'z')).toBeErr()
		})

		it('should reject undefined', () => {
			expect(t.decode(tLiteral, undefined)).toBeErr()
		})

		it('should print type', () => {
			expect(tLiteral.print()).toBe('true | 1 | 2 | "a" | "b"')
		})
	})
})

// vim: ts=4
