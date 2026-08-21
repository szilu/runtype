import * as t from './index.js'
import './jest.local.js'

declare global {
	namespace jest {
		interface Matchers<R> {
			toBeErr(pattern?: string): R
		}
	}
}

async function expectRejected<T>(tType: t.Type<T>, value: unknown) {
	expect(await t.validate(tType, value)).toBeErr()
	expect(t.validateSync(tType, value)).toBeErr()
}

describe('test addValidator() copy-on-write', () => {
	describe('test addValidator() on composite types', () => {
		it('should addValidator() on a struct type', async () => {
			const tS = t
				.struct({ n: t.number })
				.addValidator((v) => (v.n === 42 ? t.ok(v) : t.error('must be 42')))
			expect(await t.validate(tS, { n: 42 })).toEqual(t.ok({ n: 42 }))
			await expectRejected(tS, { n: 1 })
		})

		it('should addValidator() on an array type', async () => {
			const tA = t
				.array(t.number)
				.addValidator((v) => (v.length === 2 ? t.ok(v) : t.error('must have 2 items')))
			expect(await t.validate(tA, [1, 2])).toEqual(t.ok([1, 2]))
			await expectRejected(tA, [1])
		})

		it('should addValidator() on a record type', async () => {
			const tR = t
				.record(t.number)
				.addValidator((v) => (v.a === 42 ? t.ok(v) : t.error('a must be 42')))
			expect(await t.validate(tR, { a: 42 })).toEqual(t.ok({ a: 42 }))
			await expectRejected(tR, { a: 1 })
		})

		it('should addValidator() on a tuple type', async () => {
			const tT = t
				.tuple(t.number, t.string)
				.addValidator((v) => (v[0] === 42 ? t.ok(v) : t.error('must start with 42')))
			expect(await t.validate(tT, [42, 'a'])).toEqual(t.ok([42, 'a']))
			await expectRejected(tT, [1, 'a'])
		})

		it('should addValidator() on a union type', async () => {
			const tU = t
				.union(t.number, t.string)
				.addValidator((v) => (v !== 0 ? t.ok(v) : t.error('must not be 0')))
			expect(await t.validate(tU, 'a')).toEqual(t.ok('a'))
			await expectRejected(tU, 0)
		})

		it('should addValidator() on a tagged union type', async () => {
			const tTU = t
				.taggedUnion('type')({
					num: t.struct({ type: t.literal<['num']>('num'), n: t.number })
				})
				.addValidator((v) => (v.n === 42 ? t.ok(v) : t.error('must be 42')))
			expect(await t.validate(tTU, { type: 'num', n: 42 })).toEqual(
				t.ok({ type: 'num', n: 42 })
			)
			await expectRejected(tTU, { type: 'num', n: 1 })
		})

		it('should addValidator() on an intersection type', async () => {
			const tI = t
				.intersection(t.struct({ a: t.number }), t.struct({ b: t.number }))
				.addValidator((v) => (v.a === v.b ? t.ok(v) : t.error('a must equal b')))
			expect(await t.validate(tI, { a: 42, b: 42 })).toEqual(t.ok({ a: 42, b: 42 }))
			await expectRejected(tI, { a: 42, b: 1 })
		})

		it('should addValidator() on a literal type', async () => {
			const tL = t
				.literal('a', 'b')
				.addValidator((v) => (v === 'a' ? t.ok(v) : t.error('must be a')))
			expect(await t.validate(tL, 'a')).toEqual(t.ok('a'))
			await expectRejected(tL, 'b')
		})

		it('should addValidator() on a keyOf type', async () => {
			const tK = t
				.keyOf(t.struct({ a: t.number, b: t.number }))
				.addValidator((v) => (v === 'a' ? t.ok(v) : t.error('must be a')))
			expect(await t.validate(tK, 'a')).toEqual(t.ok('a'))
			await expectRejected(tK, 'b')
		})

		it('should addValidator() on a lazy type', async () => {
			const tLazy = t
				.lazy(() => t.number)
				.addValidator((v) => (v === 42 ? t.ok(v) : t.error('must be 42')))
			expect(await t.validate(tLazy, 42)).toEqual(t.ok(42))
			await expectRejected(tLazy, 1)
		})
	})

	describe('test addValidator() immutability', () => {
		it('should leave the original type unaffected', async () => {
			const tOrig = t.number
			const tChecked = tOrig.addValidator((v) => (v === 42 ? t.ok(v) : t.error('must be 42')))

			expect(tChecked).not.toBe(tOrig)
			expect(tOrig.validators).toBeUndefined()
			expect(await t.validate(tOrig, 1)).toEqual(t.ok(1))
			await expectRejected(tChecked, 1)
		})

		it('should chain validators without mutating the intermediate type', async () => {
			const tMin = t.number.min(10)
			const tBoth = tMin.max(20)

			expect(tMin.validators?.length).toBe(1)
			expect(tBoth.validators?.length).toBe(2)
			expect(await t.validate(tMin, 42)).toEqual(t.ok(42))
			await expectRejected(tBoth, 42)
		})

		it('should keep the prototype and own properties of the cloned type', () => {
			const tS = t.struct({ s: t.string, n: t.number })
			const tChecked = tS.addValidator((v) => t.ok(v))

			expect(tChecked.print()).toBe(tS.print())
			expect(tChecked.props).toBe(tS.props)
			expect(t.decode(tChecked, { s: 'string', n: 42 })).toEqual(t.ok({ s: 'string', n: 42 }))
		})
	})
})

describe('struct combinators keep the source validators', () => {
	// A struct-level validator, plus validators on a nested struct, record, union and
	// lazy field - every combinator rebuilds these types and must carry them over.
	const tPositive = t.number.addValidator((v) => (v > 0 ? t.ok(v) : t.error('must be > 0')))
	const tNested = t
		.struct({ n: tPositive })
		.addValidator((v) => (v.n !== 13 ? t.ok(v) : t.error('unlucky')))
	const tSrc = t.struct({
		nested: tNested,
		rec: t.record(tPositive),
		uni: t.union(tPositive, t.string),
		lzy: t.lazy(() => tPositive)
	})
	const tChecked = tSrc.addValidator((v) => t.ok(v))

	const bad = {
		nested: { n: -1 },
		rec: { k: -1 },
		uni: -1,
		lzy: -1
	}

	// The struct-level validator was written against a shape the derived type no longer
	// has, so it is dropped - re-attach it explicitly if it still applies.
	it('should drop the struct-level validator', () => {
		expect(t.partial(tChecked).validators).toBeUndefined()
		expect(t.patch(tChecked).validators).toBeUndefined()
		expect(t.deepPartial(tChecked).validators).toBeUndefined()
		expect(t.deepPatch(tChecked).validators).toBeUndefined()
		expect(t.pick(tChecked, ['rec']).validators).toBeUndefined()
		expect(t.omit(tChecked, ['rec']).validators).toBeUndefined()
	})

	it('should keep field validators through partial()/patch()', async () => {
		await expectRejected(t.partial(tSrc), bad)
		await expectRejected(t.patch(tSrc), bad)
	})

	it('should keep field validators through deepPartial()/deepPatch()', async () => {
		await expectRejected(t.deepPartial(tSrc), bad)
		await expectRejected(t.deepPatch(tSrc), bad)
	})

	it('should keep field validators through pick()/omit()', async () => {
		await expectRejected(t.pick(tSrc, ['rec']), { rec: { k: -1 } })
		await expectRejected(t.omit(tSrc, ['nested', 'uni', 'lzy']), { rec: { k: -1 } })
	})

	it('should keep validators on a default and an optional through patch()', async () => {
		const unlucky = (v: unknown) => (v !== 13 ? t.ok(v as number) : t.error('unlucky'))
		const tDef = t.withDefault(t.number, 0).addValidator(unlucky)
		const tOpt = t.optional(t.number).addValidator(unlucky)
		const tPatchSrc = t.struct({ d: tDef, o: tOpt })

		await expectRejected(t.patch(tPatchSrc), { d: 13 })
		await expectRejected(t.deepPatch(tPatchSrc), { o: 13 })
		// copy-on-write: the shared source types are untouched
		expect(tDef.validators?.length).toBe(1)
		expect(tOpt.validators?.length).toBe(1)
	})

	it('should keep the nested struct validator through deepPartial()', async () => {
		await expectRejected(t.deepPartial(tSrc), { nested: { n: 13 } })
		expect(await t.validate(t.deepPartial(tSrc), { nested: { n: 1 } })).toEqual(
			t.ok({ nested: { n: 1 } })
		)
	})
})

describe('a throwing validator', () => {
	const tThrows = t.number.addValidator(() => {
		throw new Error('boom')
	})

	it('should become an Err instead of escaping', async () => {
		expect(t.validateSync(tThrows, 1)).toBeErr('validator threw: boom')
		expect(await t.validate(tThrows, 1)).toBeErr('validator threw: boom')
	})

	it('should become an Err when an async validator rejects', async () => {
		const tAsync = t.number.addAsyncValidator(() => Promise.reject(new Error('async boom')))
		expect(await t.validate(tAsync, 1)).toBeErr('validator threw: async boom')
	})

	it('should not escape when deepPartial() makes a validated field absent', () => {
		const tInner = t
			.struct({ name: t.string })
			.addValidator((v) => (v.name.length > 3 ? t.ok(v) : t.error('too short')))
		expect(t.validateSync(t.deepPartial(t.struct({ inner: tInner })), { inner: {} })).toBeErr()
	})
})

// vim: ts=4
