import * as t from './index'
import './jest.local.ts'

declare global {
	namespace jest {
		interface Matchers<R> {
			toBeErr(pattern?: string): R;
		}
	}
}

describe('test array type', () => {
	const tArray = t.array(t.number)
	type Array = t.TypeOf<typeof tArray>

	it('should accept array', () => {
		expect(t.decode(tArray, [1, 2, 42])).toEqual(t.ok([1, 2, 42]))
	})

	it('should reject non array', () => {
		expect(t.decode(tArray, {})).toBeErr()
	})

	it('should reject invalid field value', () => {
		expect(t.decode(tArray, [1, 2, 'x'])).toBeErr()
	})

	it('should print array type', () => {
		expect(tArray.print()).toBe('number[]')
	})

	it('should print complex array type with parens', () => {
		expect(t.array(t.union(t.number, t.string)).print()).toBe('(number | string)[]')
	})

	// length(num)
	it('should accept length(num)', async () => {
		expect(await t.validate(tArray.length(1), [42])).toEqual(t.ok([42]))
	})

	it('should reject length(num)', async () => {
		expect(await t.validate(tArray.length(2), [42])).toBeErr()
	})

	// length(min, max))
	it('should accept length(min, max)', async () => {
		expect(await t.validate(tArray.length(0, 2), [42])).toEqual(t.ok([42]))
	})

	it('should reject length(min, max)', async () => {
		expect(await t.validate(tArray.length(2, 5), [42])).toBeErr()
	})

	// minLength()
	it('should accept minLength(num)', async () => {
		expect(await t.validate(tArray.minLength(1), [42, 42])).toEqual(t.ok([42, 42]))
	})

	it('should reject minLength(num)', async () => {
		expect(await t.validate(tArray.minLength(2), [42])).toBeErr()
	})

	// maxLength()
	it('should accept maxLength(num)', async () => {
		expect(await t.validate(tArray.maxLength(2), [42])).toEqual(t.ok([42]))
	})

	it('should reject maxLength(num)', async () => {
		expect(await t.validate(tArray.maxLength(1), [42, 42])).toBeErr()
	})
})

// vim: ts=4
