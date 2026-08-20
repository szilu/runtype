import * as t from './index.js'
import './jest.local.js'

declare global {
	namespace jest {
		interface Matchers<R> {
			toBeErr(pattern?: string): R
		}
	}
}

describe('test validateSync()', () => {
	describe('test scalar types', () => {
		it('should accept a valid value', () => {
			expect(t.validateSync(t.string.minLength(2), 'abc')).toEqual(t.ok('abc'))
		})

		it('should reject a value failing a validator', () => {
			expect(t.validateSync(t.string.minLength(2), 'a')).toBeErr()
		})

		it('should reject a value failing decode', () => {
			expect(t.validateSync(t.string.minLength(2), 42)).toBeErr()
		})

		it('should accept a type without validators', () => {
			expect(t.validateSync(t.number, 42)).toEqual(t.ok(42))
		})

		it('should reject never type', () => {
			expect(t.never.validateSync(undefined as never, {})).toBeErr()
		})
	})

	describe('test error path reporting', () => {
		it('should report the field path in a struct', () => {
			const tS = t.struct({ s: t.string.minLength(2) })
			expect(t.validateSync(tS, { s: 'a' })).toEqual(
				t.err([{ path: ['s'], error: 'length must be at least 2' }])
			)
		})

		it('should report the index path in an array', () => {
			const tA = t.array(t.string.minLength(2))
			expect(t.validateSync(tA, ['ab', 'a'])).toEqual(
				t.err([{ path: ['1'], error: 'length must be at least 2' }])
			)
		})

		it('should report the key path in a record', () => {
			const tR = t.record(t.string.minLength(2))
			expect(t.validateSync(tR, { k: 'a' })).toEqual(
				t.err([{ path: ['k'], error: 'length must be at least 2' }])
			)
		})

		it('should report every failing array element', () => {
			const tA = t.array(t.string.minLength(2))
			expect(t.validateSync(tA, ['a', 'ab', 'b'])).toEqual(
				t.err([
					{ path: ['0'], error: 'length must be at least 2' },
					{ path: ['2'], error: 'length must be at least 2' }
				])
			)
		})

		it('should report every failing record value', () => {
			const tR = t.record(t.string.minLength(2))
			expect(t.validateSync(tR, { a: 'x', b: 'ok', c: 'y' })).toEqual(
				t.err([
					{ path: ['a'], error: 'length must be at least 2' },
					{ path: ['c'], error: 'length must be at least 2' }
				])
			)
		})

		it('should report the index path in a tuple', () => {
			const tT = t.tuple(t.string, t.number.min(10))
			expect(t.validateSync(tT, ['a', 1])).toEqual(
				t.err([{ path: ['1'], error: 'must be at least 10' }])
			)
		})

		it('should report nested paths', () => {
			const tS = t.struct({ a: t.array(t.struct({ n: t.number.min(10) })) })
			expect(t.validateSync(tS, { a: [{ n: 42 }, { n: 1 }] })).toEqual(
				t.err([{ path: ['a', '1', 'n'], error: 'must be at least 10' }])
			)
		})

		it('should report validator errors in a union member', () => {
			const tU = t.union(t.number.min(10), t.string)
			expect(t.validateSync(tU, 'a')).toEqual(t.ok('a'))
			expect(t.validateSync(tU, 1)).toEqual(
				t.err([{ path: [], error: 'must be at least 10' }])
			)
		})

		it('should report validator errors in a tagged union member', () => {
			const tTU = t.taggedUnion('type')({
				num: t.struct({ type: t.literal<['num']>('num'), n: t.number.min(10) })
			})
			expect(t.validateSync(tTU, { type: 'num', n: 42 })).toEqual(
				t.ok({ type: 'num', n: 42 })
			)
			expect(t.validateSync(tTU, { type: 'num', n: 1 })).toEqual(
				t.err([{ path: ['n'], error: 'must be at least 10' }])
			)
		})

		it('should report validator errors in an intersection', () => {
			const tI = t.intersection(t.number.min(10), t.number.max(20))
			expect(t.validateSync(tI, 15)).toEqual(t.ok(15))
			expect(t.validateSync(tI, 1)).toEqual(
				t.err([{ path: [], error: 'must be at least 10' }])
			)
		})

		it('should report validator errors in an intersection of structs', () => {
			const tI = t.intersection(
				t.struct({ a: t.number.min(10) }),
				t.struct({ b: t.string.minLength(2) })
			)
			expect(t.validateSync(tI, { a: 42, b: 'ab' })).toEqual(t.ok({ a: 42, b: 'ab' }))
			expect(t.validateSync(tI, { a: 1, b: 'ab' })).toEqual(
				t.err([{ path: ['a'], error: 'must be at least 10' }])
			)
		})

		it('should report validator errors through lazy', () => {
			const tL = t.lazy(() => t.struct({ n: t.number.min(10) }))
			expect(t.validateSync(tL, { n: 42 })).toEqual(t.ok({ n: 42 }))
			expect(t.validateSync(tL, { n: 1 })).toEqual(
				t.err([{ path: ['n'], error: 'must be at least 10' }])
			)
		})

		it('should report validator errors through optional', () => {
			const tO = t.optional(t.number.min(10))
			expect(t.validateSync(tO, undefined)).toEqual(t.ok(undefined))
			expect(t.validateSync(tO, 42)).toEqual(t.ok(42))
			expect(t.validateSync(tO, 1)).toEqual(
				t.err([{ path: [], error: 'must be at least 10' }])
			)
		})

		it('should report validator errors through nullable', () => {
			const tN = t.nullable(t.number.min(10))
			expect(t.validateSync(tN, null)).toEqual(t.ok(null))
			expect(t.validateSync(tN, 42)).toEqual(t.ok(42))
			expect(t.validateSync(tN, 1)).toEqual(
				t.err([{ path: [], error: 'must be at least 10' }])
			)
		})

		it('should report validator errors through default', () => {
			const tD = t.number.min(10).default(42)
			expect(t.validateSync(tD, undefined)).toEqual(t.ok(42))
			expect(t.validateSync(tD, 1)).toEqual(
				t.err([{ path: [], error: 'must be at least 10' }])
			)
		})

		it('should report validator errors on a keyOf type', () => {
			const tK = t.keyOf(t.struct({ a: t.number, b: t.number })).in('a')
			expect(t.validateSync(tK, 'a')).toEqual(t.ok('a'))
			expect(t.validateSync(tK, 'b')).toBeErr()
		})

		it('should report validator errors on a literal type', () => {
			const tL = t.literal('a', 'b').in('a')
			expect(t.validateSync(tL, 'a')).toEqual(t.ok('a'))
			expect(t.validateSync(tL, 'b')).toBeErr()
		})
	})

	describe('test sync/async parity', () => {
		const tComplex = t.struct({
			s: t.string,
			n: t.number,
			b: t.optional(t.boolean),
			a: t.optional(
				t.array(t.tuple(t.string, t.union(t.boolean, t.nullable(t.number.between(0, 100)))))
			)
		})

		const valid = { s: 'string', n: 42, a: [['string', 42] as [string, number]] }
		const invalid = { s: 'string', n: 42, a: [['string', 420] as [string, number]] }

		it('should match validate() on a valid value', async () => {
			expect(t.validateSync(tComplex, valid)).toEqual(await t.validate(tComplex, valid))
		})

		it('should match validate() on an invalid value', async () => {
			const sync = t.validateSync(tComplex, invalid)
			expect(sync).toBeErr()
			expect(sync).toEqual(await t.validate(tComplex, invalid))
		})
	})

	describe('test async validator guard', () => {
		it('should throw when the type has async validators', () => {
			const tAsync = t.string.addAsyncValidator(async (v) => t.ok(v))
			expect(() => t.validateSync(tAsync, 'a')).toThrow(/validateSync/)
		})

		it('should throw a typed AsyncValidatorError', () => {
			const tAsync = t.string.addAsyncValidator(async (v) => t.ok(v))
			expect(() => t.validateSync(tAsync, 'a')).toThrow(t.AsyncValidatorError)
		})

		it('should throw when a nested type has async validators', () => {
			const tS = t.struct({ s: t.string.addAsyncValidator(async (v) => t.ok(v)) })
			expect(() => t.validateSync(tS, { s: 'a' })).toThrow(/validate\(\)/)
		})

		it('should not throw when the type only has sync validators', () => {
			expect(() => t.validateSync(t.string.minLength(2), 'abc')).not.toThrow()
		})
	})

	describe('test addAsyncValidator()', () => {
		it('should accept a valid value under validate()', async () => {
			const tAsync = t.number.addAsyncValidator(async (v) =>
				v === 42 ? t.ok(v) : t.error('must be 42')
			)
			expect(await t.validate(tAsync, 42)).toEqual(t.ok(42))
		})

		it('should reject an invalid value under validate()', async () => {
			const tAsync = t.number.addAsyncValidator(async (v) =>
				v === 42 ? t.ok(v) : t.error('must be 42')
			)
			expect(await t.validate(tAsync, 1)).toEqual(t.err([{ path: [], error: 'must be 42' }]))
		})

		it('should run both sync and async validators under validate()', async () => {
			const tBoth = t.number
				.min(0)
				.addAsyncValidator(async (v) =>
					v <= 100 ? t.ok(v) : t.error('must be at most 100')
				)
			expect(await t.validate(tBoth, 42)).toEqual(t.ok(42))
			expect(await t.validate(tBoth, -1)).toEqual(
				t.err([{ path: [], error: 'must be at least 0' }])
			)
			expect(await t.validate(tBoth, 420)).toEqual(
				t.err([{ path: [], error: 'must be at most 100' }])
			)
		})

		it('should keep sync and async validators in separate registries', () => {
			const tBoth = t.number.min(0).addAsyncValidator(async (v) => t.ok(v))
			expect(tBoth.validators?.length).toBe(1)
			expect(tBoth.asyncValidators?.length).toBe(1)
			expect(t.number.asyncValidators).toBeUndefined()
		})
	})

	describe('test remaining scalar types', () => {
		it('should validate a date', () => {
			expect(t.validateSync(t.date, new Date('2024-01-01'))).toEqual(
				t.ok(new Date('2024-01-01'))
			)
			expect(t.validateSync(t.date, '2024-01-01')).toBeErr()
		})

		it('should validate a bigint', () => {
			expect(t.validateSync(t.bigint, 42n)).toEqual(t.ok(42n))
			expect(t.validateSync(t.bigint, 42)).toBeErr()
		})

		it('should run bigint validators', () => {
			expect(t.validateSync(t.bigint.min(10n), 42n)).toEqual(t.ok(42n))
			expect(t.validateSync(t.bigint.min(10n), 5n)).toBeErr()
		})

		it('should validate a symbol', () => {
			const s = Symbol('x')
			expect(t.validateSync(t.symbol, s)).toEqual(t.ok(s))
			expect(t.validateSync(t.symbol, 'x')).toBeErr()
		})

		it('should validate void', () => {
			expect(t.validateSync(t.voidType, undefined)).toEqual(t.ok(undefined))
			expect(t.validateSync(t.voidType, 42)).toBeErr()
		})

		it('should validate boolean', () => {
			expect(t.validateSync(t.boolean, true)).toEqual(t.ok(true))
			expect(t.validateSync(t.boolean, 'x')).toBeErr()
		})

		it('should validate any', () => {
			expect(t.validateSync(t.any, 'whatever')).toEqual(t.ok('whatever'))
			expect(t.validateSync(t.any, undefined)).toEqual(t.ok(undefined))
		})

		it('should validate unknown as the top type', () => {
			expect(t.validateSync(t.unknown, null)).toEqual(t.ok(null))
			expect(t.validateSync(t.unknown, undefined)).toEqual(t.ok(undefined))
			expect(t.validateSync(t.unknown, {})).toEqual(t.ok({}))
		})

		it('should validate defined', () => {
			expect(t.validateSync(t.defined, 42)).toEqual(t.ok(42))
			expect(t.validateSync(t.defined, null)).toBeErr()
			expect(t.validateSync(t.defined, undefined)).toBeErr()
		})
	})

	describe('test validators attached to wrapper types', () => {
		it('should run a validator attached to an optional wrapper for present values', () => {
			const tO = t
				.optional(t.string)
				.addValidator((v) => (v === 'forbidden' ? t.error('forbidden') : t.ok(v)))
			expect(t.validateSync(tO, 'ok')).toEqual(t.ok('ok'))
			expect(t.validateSync(tO, 'forbidden')).toBeErr()
		})

		it('should run a validator attached to a nullable wrapper for present values', () => {
			const tN = t
				.nullable(t.number)
				.addValidator((v) => (v === 0 ? t.error('zero not allowed') : t.ok(v)))
			expect(t.validateSync(tN, 42)).toEqual(t.ok(42))
			expect(t.validateSync(tN, 0)).toBeErr()
		})
	})

	describe('test async validator guard through nested types', () => {
		it('should throw when an array member has async validators', () => {
			const tA = t.array(t.string.addAsyncValidator(async (v) => t.ok(v)))
			expect(() => t.validateSync(tA, ['a'])).toThrow(t.AsyncValidatorError)
		})

		it('should throw when a union member that matches has async validators', () => {
			const tU = t.union(
				t.string.addAsyncValidator(async (v) => t.ok(v)),
				t.number
			)
			expect(() => t.validateSync(tU, 'a')).toThrow(t.AsyncValidatorError)
		})

		it('should not throw for a union value matching a sync-only member', () => {
			const tU = t.union(
				t.string.addAsyncValidator(async (v) => t.ok(v)),
				t.number
			)
			expect(t.validateSync(tU, 1)).toEqual(t.ok(1))
		})

		it('should not throw inside an optional whose value is undefined', () => {
			const tO = t.optional(t.string.addAsyncValidator(async (v) => t.ok(v)))
			expect(t.validateSync(tO, undefined)).toEqual(t.ok(undefined))
			expect(() => t.validateSync(tO, 'a')).toThrow(t.AsyncValidatorError)
		})

		it('should throw when a deeply nested type has async validators', () => {
			const tDeep = t.struct({
				items: t.array(t.struct({ s: t.string.addAsyncValidator(async (v) => t.ok(v)) }))
			})
			expect(() => t.validateSync(tDeep, { items: [{ s: 'a' }] })).toThrow(
				t.AsyncValidatorError
			)
		})
	})
})

// vim: ts=4
