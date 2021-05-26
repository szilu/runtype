import * as t from './index'
import './jest.local.ts'

declare global {
	namespace jest {
		interface Matchers<R> {
			toBeErr(pattern?: string): R;
		}
	}
}

describe('test tuple type', () => {
	const tTuple = t.tuple(t.number, t.string)
	type Tuple = t.TypeOf<typeof tTuple>

	// These are compile time tests for the TS type inference :)
	const tuple1: Tuple = [42, 'x']

	// Uncomment these to test TS type inference
	//const tuple2: Tuple = [42, 42]
	//const tuple3: Tuple = [42]
	//const tuple4: Tuple = [42, 'x', 34]

	it('should accept tuple', () => {
		expect(t.decode(tTuple, [1, 'x'])).toEqual(t.ok([1, 'x']))
	})

	it('should reject non array', () => {
		expect(t.decode(tTuple, {})).toBeErr()
	})

	it('should reject invalid field value', () => {
		expect(t.decode(tTuple, [1, 2])).toBeErr()
	})

	it('should reject on missing field', () => {
		expect(t.decode(tTuple, [1])).toBeErr()
	})

	it('should print tuple type', () => {
		expect(tTuple.print()).toBe('[number, string]')
	})
})

// vim: ts=4
