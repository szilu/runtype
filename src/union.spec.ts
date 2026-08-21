import * as t from './index.js'
import './jest.local.js'

declare global {
	namespace jest {
		interface Matchers<R> {
			toBeErr(pattern?: string): R
		}
	}
}

describe('test union type', () => {
	const tStruct = t.struct({ n: t.number, s: t.optional(t.string) })
	type Struct = t.TypeOf<typeof tStruct>

	const tUnion = t.union(t.number, t.string, tStruct)
	type Union = t.TypeOf<typeof tUnion>

	// These are compile time tests for the TS type inference :)
	const union1: Union = 42
	const union2: Union = { n: 42 }

	// Uncomment these to test TS type inference
	//const union2: Union = true
	//const union2: Union = { s: 'string', n: 42, b: true }
	//const union3: Union = { s: 'x' }

	it('should accept number', () => {
		expect(t.decode(tUnion, 42)).toEqual(t.ok(42))
	})

	it('should accept comforming object', () => {
		expect(t.decode(tUnion, { n: 42 })).toEqual(t.ok({ n: 42 }))
	})

	it('should reject null', () => {
		expect(t.decode(tUnion, null)).toBeErr()
	})

	it('should reject empty object', () => {
		expect(t.decode(tUnion, {})).toBeErr()
	})

	it('should print type', () => {
		expect(tUnion.print()).toBe('number | string | { n: number, s?: string | undefined }')
	})

	it('should accept a value matching a later member when an earlier one fails validation', () => {
		const tU = t.union(t.number.min(10), t.number)
		expect(t.validateSync(tU, 1)).toEqual(t.ok(1))
	})

	it('should attribute each member reason and report all of them', () => {
		const res = t.decode(t.union(t.string, t.number), true)
		expect(t.isErr(res) && res.err.map((e) => e.error)).toEqual([
			'member 0: expected string',
			'member 1: expected number'
		])
	})

	it('should report every candidate members validation error, not just the first', () => {
		const tU = t.union(t.string.minLength(5), t.string.matches(/^z/))
		const res = t.validateSync(tU, 'ab')
		expect(t.isErr(res) && res.err.length).toBe(2)
	})

	it('should report only the closest matching member', () => {
		const tU = t.union(
			t.struct({ k: t.literal('a'), v: t.number }),
			t.struct({ k: t.literal('b'), w: t.string, x: t.string })
		)
		const res = t.decode(tU, { k: 'a', v: 'not a number' })
		expect(t.isErr(res) && res.err.map((e) => e.error)).toEqual(['member 0: expected number'])
	})
})

// vim: ts=4
