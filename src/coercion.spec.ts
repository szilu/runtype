import * as t from './index.js'
import './jest.local.js'

declare global {
	namespace jest {
		interface Matchers<R> {
			toBeErr(pattern?: string): R
		}
	}
}

type Opts = t.DecoderOpts

// Regression guards for the built-in coercion matrix. These pin the behavior as it stands
// after the revert of PR #4 (commit fcb284c), which had taught T.boolean to read the fixed
// strings 'true'/'false'. That rule is ambiguous and caller-owned now (see the custom
// coercion tests below), so the built-ins must not drift.
describe('built-in coercion matrix', () => {
	describe('string', () => {
		it.each<[unknown, Opts, string]>([
			[42, { coerceNumberToString: true }, '42'],
			[42, { coerceScalar: true }, '42'],
			[42, { coerceAll: true }, '42'],
			[NaN, { coerceAll: true }, 'NaN']
		])('accepts %p with %p', (v, opts, exp) => {
			expect(t.decode(t.string, v, opts)).toEqual(t.ok(exp))
		})

		it.each<[unknown, Opts]>([
			[42, {}],
			[{}, { coerceAll: true }],
			[true, { coerceAll: true }],
			[42n, { coerceAll: true }],
			[null, { coerceAll: true }]
		])('rejects %p with %p', (v, opts) => {
			expect(t.decode(t.string, v, opts)).toBeErr()
		})
	})

	describe('number', () => {
		it.each<[unknown, Opts, number]>([
			['42', { coerceStringToNumber: true }, 42],
			['42', { coerceScalar: true }, 42],
			['42', { coerceAll: true }, 42],
			['', { coerceAll: true }, 0],
			[' 42 ', { coerceAll: true }, 42],
			['0x10', { coerceAll: true }, 16],
			['abc', { coerceAll: true, acceptNaN: true }, NaN],
			[NaN, { acceptNaN: true }, NaN]
		])('accepts %p with %p', (v, opts, exp) => {
			expect(t.decode(t.number, v, opts)).toEqual(t.ok(exp))
		})

		it.each<[unknown, Opts]>([
			['42', {}],
			['abc', { coerceAll: true }],
			[NaN, {}],
			// coerceAll is not acceptNaN
			[NaN, { coerceAll: true }]
		])('rejects %p with %p', (v, opts) => {
			expect(t.decode(t.number, v, opts)).toBeErr()
		})
	})

	describe('integer', () => {
		it('accepts a coerced integer string', () => {
			expect(t.decode(t.integer, '42', { coerceAll: true })).toEqual(t.ok(42))
		})

		it('rejects a fractional string with its own message', () => {
			expect(t.decode(t.integer, '42.5', { coerceAll: true })).toBeErr('expected integer')
		})

		it('rejects an uncoercible value with its own message', () => {
			expect(t.decode(t.integer, 'x')).toBeErr('expected integer')
		})

		it("forwards a custom coercer's message", () => {
			const coerceToNumber: t.Coercer<number> = () => t.error('expected yes/no')
			expect(t.decode(t.integer, 'nope', { coerceToNumber })).toBeErr('expected yes/no')
		})

		it("forwards the built-in coercer's message too", () => {
			// Deliberate: a coercer's error is reported as-is wherever a coercer runs, so a
			// value that cannot become a number at all says so instead of 'expected integer'.
			expect(t.decode(t.integer, 'x', { coerceAll: true })).toBeErr('expected number')
		})
	})

	describe('boolean', () => {
		it.each<[unknown, Opts, boolean]>([
			// PR #4 (reverted) would have made this ok(false). It is ok(true): 'false' is a
			// non-empty non-numeric string, and the library does not guess wire formats.
			['false', { coerceAll: true }, true],
			['x', { coerceAll: true }, true],
			['', { coerceAll: true }, false],
			['0', { coerceAll: true }, false],
			[' ', { coerceAll: true }, false],
			['1', { coerceAll: true }, true],
			['1', { coerceStringToNumber: true, coerceNumberToBoolean: true }, true],
			[1, { coerceNumberToBoolean: true }, true],
			[0, { coerceNumberToBoolean: true }, false]
		])('accepts %p with %p', (v, opts, exp) => {
			expect(t.decode(t.boolean, v, opts)).toEqual(t.ok(exp))
		})

		it.each<[unknown, Opts]>([
			['1', { coerceStringToNumber: true }],
			['1', { coerceNumberToBoolean: true }],
			// the string source alone never enables the number source
			[1, { coerceStringToNumber: true }],
			[1, {}]
		])('rejects %p with %p', (v, opts) => {
			expect(t.decode(t.boolean, v, opts)).toBeErr()
		})
	})

	describe('date', () => {
		it('returns an accepted Date by reference', () => {
			const d = new Date(0)
			const res = t.decode(t.date, d)
			expect(t.isOk(res) && res.ok).toBe(d)
		})

		it.each<[unknown, Opts]>([
			[0, { coerceNumberToDate: true }],
			[0, { coerceDate: true }],
			[0, { coerceAll: true }],
			['2000-01-01', { coerceStringToDate: true }],
			['2000-01-01', { coerceDate: true }],
			['2000-01-01', { coerceAll: true }]
		])('accepts %p with %p', (v, opts) => {
			const res = t.decode(t.date, v, opts)
			expect(t.isOk(res) && res.ok).toEqual(new Date(v as number))
		})

		it.each<[unknown, Opts]>([
			[new Date('x'), { coerceAll: true }],
			[0, { coerceStringToDate: true }],
			['2000-01-01', { coerceNumberToDate: true }],
			[0, {}],
			['2000-01-01', {}]
		])('rejects %p with %p', (v, opts) => {
			expect(t.decode(t.date, v, opts)).toBeErr()
		})
	})

	describe('bigint', () => {
		it.each<[unknown, Opts, bigint]>([
			['42', { coerceStringToBigInt: true }, 42n],
			['42', { coerceBigInt: true }, 42n],
			['42', { coerceAll: true }, 42n],
			['', { coerceAll: true }, 0n],
			[' 42 ', { coerceAll: true }, 42n],
			['0x10', { coerceAll: true }, 16n],
			[42, { coerceNumberToBigInt: true }, 42n],
			[42, { coerceBigInt: true }, 42n],
			[42, { coerceAll: true }, 42n]
		])('accepts %p with %p', (v, opts, exp) => {
			expect(t.decode(t.bigint, v, opts)).toEqual(t.ok(exp))
		})

		it.each<[unknown, Opts]>([
			['42.5', { coerceAll: true }],
			['abc', { coerceAll: true }],
			[42.5, { coerceAll: true }],
			[Infinity, { coerceAll: true }],
			[NaN, { coerceAll: true }],
			['42', {}],
			[42, {}]
		])('rejects %p with %p', (v, opts) => {
			expect(t.decode(t.bigint, v, opts)).toBeErr()
		})
	})

	describe('group flags stay in their own group', () => {
		it('coerceDate does not enable scalar coercion', () => {
			expect(t.decode(t.string, 42, { coerceDate: true })).toBeErr()
			expect(t.decode(t.number, '42', { coerceDate: true })).toBeErr()
		})

		it('coerceScalar does not enable date or bigint coercion', () => {
			expect(t.decode(t.date, 0, { coerceScalar: true })).toBeErr()
			expect(t.decode(t.bigint, '42', { coerceScalar: true })).toBeErr()
		})
	})
})

// The 'true'/'false' rule PR #4 tried to bake in is three lines of caller code now - and
// which three lines depends entirely on the wire format being decoded.
describe('custom boolean coercion', () => {
	// XSD / query string: 'true'|'false'|'1'|'0', case-insensitive
	const xsdBoolean: t.Coercer<boolean> = (v) => {
		if (typeof v !== 'string') return t.error('expected boolean')
		const s = v.toLowerCase()
		return s === 'true' || s === '1'
			? t.ok(true)
			: s === 'false' || s === '0'
				? t.ok(false)
				: t.error('expected boolean')
	}

	// strict: exactly 'true' or 'false', nothing else
	const strictBoolean: t.Coercer<boolean> = (v) =>
		v === 'true'
			? t.ok(true)
			: v === 'false'
				? t.ok(false)
				: t.error("expected 'true' or 'false'")

	// a different vocabulary entirely, with its own message
	const yesNoBoolean: t.Coercer<boolean> = (v) =>
		v === 'yes' ? t.ok(true) : v === 'no' ? t.ok(false) : t.error('expected yes/no')

	it.each<[unknown, boolean]>([
		['false', false],
		['FALSE', false],
		['0', false],
		['true', true],
		['1', true]
	])('xsdBoolean decodes %p as %p', (v, exp) => {
		expect(t.decode(t.boolean, v, { coerceToBoolean: xsdBoolean })).toEqual(t.ok(exp))
	})

	it('xsdBoolean rejects a foreign vocabulary', () => {
		expect(t.decode(t.boolean, 'yes', { coerceToBoolean: xsdBoolean })).toBeErr(
			'expected boolean'
		)
	})

	it.each<[unknown]>([['TRUE'], ['1'], ['']])('strictBoolean rejects %p', (v) => {
		expect(t.decode(t.boolean, v, { coerceToBoolean: strictBoolean })).toBeErr(
			"expected 'true' or 'false'"
		)
	})

	it('yesNoBoolean reports its own message', () => {
		expect(t.decode(t.boolean, 'true', { coerceToBoolean: yesNoBoolean })).toBeErr(
			'expected yes/no'
		)
		expect(t.decode(t.boolean, 'no', { coerceToBoolean: yesNoBoolean })).toEqual(t.ok(false))
	})

	// the actual use case from PR #4, caller-owned
	it('works inside a struct', () => {
		expect(
			t.decode(
				t.struct({ active: t.boolean }),
				{ active: 'false' },
				{ coerceToBoolean: xsdBoolean }
			)
		).toEqual(t.ok({ active: false }))
	})

	it('reaches a source no built-in handles', () => {
		expect(
			t.decode(t.number, 42n, {
				coerceToNumber: (v) =>
					typeof v === 'bigint' ? t.ok(Number(v)) : t.error('expected number')
			})
		).toEqual(t.ok(42))
	})
})

describe('coercion hooks', () => {
	it('an explicit slot beats the flags', () => {
		expect(
			t.decode(t.number, '42', { coerceAll: true, coerceToNumber: () => t.error('nope') })
		).toBeErr('nope')
	})

	it('is not consulted for a value already of the target type', () => {
		const fn = jest.fn(() => t.ok(0))
		expect(t.decode(t.number, 42, { coerceAll: true, coerceToNumber: fn })).toEqual(t.ok(42))
		expect(fn).not.toHaveBeenCalled()
	})

	it('reports its error at the failing path', () => {
		const coerceToNumber: t.Coercer<number> = () => t.error('not a number here')
		expect(t.decode(t.struct({ n: t.number }), { n: 'x' }, { coerceToNumber })).toEqual(
			t.err([{ path: ['n'], error: 'not a number here' }])
		)
		expect(t.decode(t.array(t.number), ['x'], { coerceToNumber })).toEqual(
			t.err([{ path: ['0'], error: 'not a number here' }])
		)
	})

	it('a throwing hook is reported, not thrown', () => {
		expect(
			t.decode(t.number, 'x', {
				coerceToNumber: () => {
					throw new Error('boom')
				}
			})
		).toBeErr('coercer threw: boom')

		expect(
			t.decode(t.array(t.number), 'x', {
				coerceToArray: () => {
					throw new Error('boom')
				}
			})
		).toBeErr('expected Array')
	})

	it('resolved opts reach nested leaves', () => {
		const tType = t.struct({ list: t.array(t.number.optional()) })
		expect(t.decode(tType, { list: ['1', undefined, '2'] }, { coerceAll: true })).toEqual(
			t.ok({ list: [1, undefined, 2] })
		)
	})

	it('feeds the validators', () => {
		expect(t.validateSync(t.number.min(10), 'x', { coerceToNumber: () => t.ok(5) })).toBeErr(
			'must be at least 10'
		)
	})

	it('does not reach types that ignore opts', () => {
		const coerceToString: t.Coercer<string> = () => t.ok('a')
		expect(t.decode(t.literal('a'), 'b', { coerceToString })).toBeErr()
		expect(t.decode(t.keyOf(t.struct({ a: t.number })), 'b', { coerceToString })).toBeErr()
	})
})

describe('resolveContext', () => {
	it('returns the given object itself when nothing is coerced', () => {
		for (const o of [{}, { unknownFields: 'drop' }] as t.DecoderOpts[]) {
			expect(t.resolveContext(o)).toBe(o)
		}
	})

	it('selects the same precomputed functions for equivalent flags', () => {
		const scalar = t.resolveContext({ coerceScalar: true })
		const all = t.resolveContext({ coerceAll: true })
		expect(scalar.coerceToString).toBe(all.coerceToString)
		expect(scalar.coerceToNumber).toBe(all.coerceToNumber)
		expect(scalar.coerceToBoolean).toBe(all.coerceToBoolean)
	})

	it('picks the NaN number variant only with acceptNaN', () => {
		const plain = t.resolveContext({ coerceScalar: true }).coerceToNumber
		const nan = t.resolveContext({ coerceScalar: true, acceptNaN: true }).coerceToNumber
		expect(plain).not.toBe(nan)
		expect(plain?.('abc')).toBeErr()
		expect(nan?.('abc')).toEqual(t.ok(NaN))
	})

	it('is idempotent', () => {
		for (const o of [
			{},
			{ coerceAll: true },
			{ coerceStringToDate: true }
		] as t.DecoderOpts[]) {
			expect(t.resolveContext(t.resolveContext(o))).toEqual(t.resolveContext(o))
		}
	})

	it('carries the non-flag fields through and drops the flags', () => {
		const coerceToArray = (v: unknown) => v
		const ctx = t.resolveContext({
			coerceAll: true,
			acceptNaN: true,
			unknownFields: 'drop',
			coerceToArray
		})
		expect(ctx.acceptNaN).toBe(true)
		expect(ctx.unknownFields).toBe('drop')
		expect(ctx.coerceToArray).toBe(coerceToArray)
		expect(ctx).not.toHaveProperty('coerceAll')
	})
})

// vim: ts=4
