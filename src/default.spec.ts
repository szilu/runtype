import * as t from './index.js'
import './jest.local.js'

declare global {
	namespace jest {
		interface Matchers<R> {
			toBeErr(pattern?: string): R;
		}
	}
}

describe('test default type', () => {
	describe('with number default', () => {
		const tWithDefault = t.number.default(0)
		type WithDefault = t.TypeOf<typeof tWithDefault>

		// Compile-time type check: should be number (not number | undefined)
		const d1: WithDefault = 42
		// const d2: WithDefault = undefined  // Should fail TS

		it('should accept explicit value', () => {
			expect(t.decode(tWithDefault, 42)).toEqual(t.ok(42))
		})

		it('should return default for undefined', () => {
			expect(t.decode(tWithDefault, undefined)).toEqual(t.ok(0))
		})

		it('should reject invalid types', () => {
			expect(t.decode(tWithDefault, 'z')).toBeErr()
		})

		it('should print type', () => {
			expect(tWithDefault.print()).toBe('number = 0')
		})
	})

	describe('with string default', () => {
		const tStringDefault = t.string.default('N/A')

		it('should return default for undefined', () => {
			expect(t.decode(tStringDefault, undefined)).toEqual(t.ok('N/A'))
		})

		it('should accept valid string', () => {
			expect(t.decode(tStringDefault, 'hello')).toEqual(t.ok('hello'))
		})

		it('should print type', () => {
			expect(tStringDefault.print()).toBe('string = "N/A"')
		})
	})

	describe('with boolean default', () => {
		const tBoolDefault = t.boolean.default(false)

		it('should return default for undefined', () => {
			expect(t.decode(tBoolDefault, undefined)).toEqual(t.ok(false))
		})

		it('should accept true', () => {
			expect(t.decode(tBoolDefault, true)).toEqual(t.ok(true))
		})
	})

	describe('with factory function', () => {
		const tWithFactory = t.date.default(() => new Date('2000-01-01'))

		it('should call factory for undefined', () => {
			const result = t.decode(tWithFactory, undefined)
			expect(t.isOk(result)).toBe(true)
			if (t.isOk(result)) {
				expect(result.ok).toEqual(new Date('2000-01-01'))
			}
		})

		it('should print type with factory', () => {
			expect(tWithFactory.print()).toBe('Date = <factory>')
		})

		it('should call factory each time', () => {
			const dates: Date[] = []
			const tArray = t.date.default(() => {
				const d = new Date()
				dates.push(d)
				return d
			})

			t.decode(tArray, undefined)
			t.decode(tArray, undefined)
			expect(dates.length).toBe(2)
		})
	})

	describe('with validators', () => {
		const tWithValidators = t.number.min(0).default(10)

		it('should pass decode with default', () => {
			expect(t.decode(tWithValidators, undefined)).toEqual(t.ok(10))
		})

		it('should pass validation with valid default', async () => {
			expect(await t.validate(tWithValidators, undefined)).toEqual(t.ok(10))
		})

		it('should pass validation with valid value', async () => {
			expect(await t.validate(tWithValidators, 5)).toEqual(t.ok(5))
		})

		it('should fail validation with invalid value', async () => {
			expect(await t.validate(tWithValidators, -5)).toBeErr()
		})
	})

	describe('with struct', () => {
		const tConfig = t.struct({
			timeout: t.number.default(5000),
			retries: t.number.default(3),
			name: t.string
		})
		type Config = t.TypeOf<typeof tConfig>

		// Compile-time check: all fields should be required in the output type
		const c: Config = { timeout: 1000, retries: 5, name: 'test' }

		it('should use defaults for missing fields', () => {
			expect(t.decode(tConfig, { name: 'test' })).toEqual(t.ok({
				timeout: 5000,
				retries: 3,
				name: 'test'
			}))
		})

		it('should accept explicit values', () => {
			expect(t.decode(tConfig, { timeout: 1000, retries: 1, name: 'test' })).toEqual(t.ok({
				timeout: 1000,
				retries: 1,
				name: 'test'
			}))
		})

		it('should fail if non-default field is missing', () => {
			expect(t.decode(tConfig, { timeout: 1000 })).toBeErr()
		})
	})

	describe('chaining default with other modifiers', () => {
		const tOptionalWithDefault = t.optional(t.number).default(0)

		it('should work with optional wrapper', () => {
			expect(t.decode(tOptionalWithDefault, undefined)).toEqual(t.ok(0))
			expect(t.decode(tOptionalWithDefault, 42)).toEqual(t.ok(42))
		})
	})
})

// vim: ts=4
