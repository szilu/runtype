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
		expect(tArray.decode([1, 2, 42])).toEqual(t.ok([1, 2, 42]))
	})

	it('should reject non array', () => {
		expect(tArray.decode({})).toBeErr()
	})

	it('should reject invalid field value', () => {
		expect(tArray.decode([1, 2, 'x'])).toBeErr()
	})

	it('should print array type', () => {
		expect(tArray.print()).toBe('number[]')
	})

	it('should print complex array type with parens', () => {
		expect(t.array(t.union(t.number, t.string)).print()).toBe('(number | string)[]')
	})
})

// vim: ts=4
