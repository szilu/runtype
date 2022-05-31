import * as t from './index'
import './jest.local.ts'

declare global {
	namespace jest {
		interface Matchers<R> {
			toBeErr(pattern?: string): R;
		}
	}
}

describe('test literal type', () => {
	const tStruct = t.struct({
		i: t.integer,
		n: t.number,
		s: t.string
	})
	const tKeyOf = t.keyOf(tStruct)
	type KeyOf = t.TypeOf<typeof tKeyOf>
	const k: KeyOf = 'i'

	it('should accept "i"', () => {
		expect(t.decode(tKeyOf, 'i')).toEqual(t.ok('i'))
	})

	it('should reject "z"', () => {
		expect(t.decode(tKeyOf, 'z')).toBeErr()
	})

	it('should reject undefined', () => {
		expect(t.decode(tKeyOf, undefined)).toBeErr()
	})

	it('should print type', () => {
		expect(tKeyOf.print()).toBe('"i" | "n" | "s"')
	})

	// in()
	it('should accept in()', async () => {
		expect(await t.validate(tKeyOf.in('i', 'n'), 'i')).toEqual(t.ok('i'))
	})

	it('should reject in()', async () => {
		expect(await t.validate(tKeyOf.in('i', 'n'), 's')).toBeErr()
	})
})

// vim: ts=4
