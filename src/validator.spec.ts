import * as t from './index'
import * as v from './validator'
import './jest.local.ts'

declare global {
	namespace jest {
		interface Matchers<R> {
			toBeErr(pattern?: string): R;
		}
	}
}

describe('test validators', () => {
	describe('test number validator', () => {
		it('should accept valid number', async () => {
			expect(await v.validate(42, t.number, v.number())).toEqual(t.ok(undefined))
		})

		it('should reject invalid type number', async () => {
			expect(await v.validate('42', t.number, v.number())).toBeErr()
		})

		// enum
		it('should accept number enum', async () => {
			expect(await v.validate(42, t.number, v.number().in(1, 3, 7, 42))).toEqual(t.ok(undefined))
		})

		it('should reject number enum', async () => {
			expect(await v.validate(42, t.number, v.number().in(1, 3, 7))).toBeErr()
		})

		// integer
		it('should accept integer', async () => {
			expect(await v.validate(42, t.number, v.number().integer())).toEqual(t.ok(undefined))
		})

		it('should reject number enum', async () => {
			expect(await v.validate(42.7, t.number, v.number().integer())).toBeErr()
		})

		// positive
		it('should accept positive', async () => {
			expect(await v.validate(42, t.number, v.number().positive())).toEqual(t.ok(undefined))
		})

		it('should reject non-positive', async () => {
			expect(await v.validate(-42, t.number, v.number().positive())).toBeErr()
		})

		// negative
		it('should accept negative', async () => {
			expect(await v.validate(-42, t.number, v.number().negative())).toEqual(t.ok(undefined))
		})

		it('should reject non-negative', async () => {
			expect(await v.validate(42, t.number, v.number().negative())).toBeErr()
		})

		// min
		it('should accept min', async () => {
			expect(await v.validate(42, t.number, v.number().min(41))).toEqual(t.ok(undefined))
		})

		it('should reject non-min', async () => {
			expect(await v.validate(42, t.number, v.number().min(43))).toBeErr()
		})

		// max
		it('should accept max', async () => {
			expect(await v.validate(42, t.number, v.number().max(43))).toEqual(t.ok(undefined))
		})

		it('should reject non-max', async () => {
			expect(await v.validate(42, t.number, v.number().max(41))).toBeErr()
		})
	})
	describe('test string validator', () => {
		it('should accept valid string', async () => {
			expect(await v.validate('a', t.string, v.string())).toEqual(t.ok(undefined))
		})

		// enum
		it('should accept string enum', async () => {
			expect(await v.validate('a', t.string, v.string().in('a', 'b', 'c'))).toEqual(t.ok(undefined))
		})

		it('should reject string enum', async () => {
			expect(await v.validate('x', t.string, v.string().in('a', 'b', 'c'))).toBeErr()
		})

		// length
		it('should accept matching length', async () => {
			expect(await v.validate('a', t.string, v.string().length(1))).toEqual(t.ok(undefined))
		})

		it('should reject non-matching length', async () => {
			expect(await v.validate('a', t.string, v.string().length(2))).toBeErr()
		})

		// minLength
		it('should accept matching minLength', async () => {
			expect(await v.validate('aaa', t.string, v.string().minLength(2))).toEqual(t.ok(undefined))
		})

		it('should reject non-matching minLength', async () => {
			expect(await v.validate('aaa', t.string, v.string().minLength(4))).toBeErr()
		})

		// maxLength
		it('should accept matching maxLength', async () => {
			expect(await v.validate('aaa', t.string, v.string().maxLength(4))).toEqual(t.ok(undefined))
		})

		it('should reject non-matching maxLength', async () => {
			expect(await v.validate('aaa', t.string, v.string().maxLength(2))).toBeErr()
		})

		// matches
		it('should accept matching matches', async () => {
			expect(await v.validate('a', t.string, v.string().matches(/a/))).toEqual(t.ok(undefined))
		})

		it('should reject non-matching matches', async () => {
			expect(await v.validate('a', t.string, v.string().matches(/b/))).toBeErr()
		})

		// email
		it('should accept matching email', async () => {
			expect(await v.validate('a@example.com', t.string, v.string().email())).toEqual(t.ok(undefined))
		})

		it('should reject non-matching email', async () => {
			expect(await v.validate('a@a', t.string, v.string().email())).toEqual(t.err([{ path: [], error: 'must be valid email address' }]))
		})
	})
	describe('test boolean validator', () => {
		it('should accept valid boolean', async () => {
			expect(await v.validate(true, t.boolean, v.boolean())).toEqual(t.ok(undefined))
		})

		// true
		it('should accept true', async () => {
			expect(await v.validate(true, t.boolean, v.boolean().true())).toEqual(t.ok(undefined))
		})

		it('should reject non-matching length', async () => {
			expect(await v.validate(false, t.boolean, v.boolean().true())).toBeErr()
		})

		// false
		it('should accept false', async () => {
			expect(await v.validate(false, t.boolean, v.boolean().false())).toEqual(t.ok(undefined))
		})

		it('should reject non-matching length', async () => {
			expect(await v.validate(true, t.boolean, v.boolean().false())).toBeErr()
		})
	})
	describe('test date validator', () => {
		it('should accept valid date', async () => {
			expect(await v.validate('2021-06-03', t.string, v.date())).toEqual(t.ok(undefined))
		})

		// min
		it('should accept min', async () => {
			expect(await v.validate('2021-06-03', t.string, v.date().min('2021-06-02'))).toEqual(t.ok(undefined))
		})

		it('should reject non-min', async () => {
			expect(await v.validate('2021-06-01', t.string, v.date().min('2021-06-02'))).toEqual(t.err([{ path: [], error: 'must be at least 2021-06-02T00:00:00.000Z' }]))
		})

		// max
		it('should accept max', async () => {
			expect(await v.validate('2021-06-01', t.string, v.date().max('2021-06-02'))).toEqual(t.ok(undefined))
		})

		it('should reject non-min', async () => {
			expect(await v.validate('2021-06-03', t.string, v.date().max('2021-06-02'))).toEqual(t.err([{ path: [], error: 'must be at most 2021-06-02T00:00:00.000Z' }]))
		})
	})
	describe('test validator function', () => {
		const  accept42 = (n: number) => n === 42 ? t.ok(undefined) : t.err('must be 42')

		it('should accept 42', async () => {
			expect(await v.validate(42, t.number, accept42)).toEqual(t.ok(undefined))
		})

		it('should reject 43', async () => {
			expect(await v.validate(43, t.number, accept42)).toEqual(t.err([{ path: [], error: 'must be 42' }]))
		})
	})
	describe('test validator composition', () => {
		const accept42 = v.number().in(42).compose()

		it('should accept 42', async () => {
			expect(await v.validate(42, t.number, accept42)).toEqual(t.ok(undefined))
		})

		it('should reject 43', async () => {
			expect(await v.validate(43, t.number, accept42)).toEqual(t.err([{ path: [], error: 'must be one of [42]' }]))
		})
	})
})

// vim: ts=4
