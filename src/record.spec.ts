import * as t from './index'
import './jest.local.ts'

declare global {
	namespace jest {
		interface Matchers<R> {
			toBeErr(pattern?: string): R;
		}
	}
}

describe('test record type', () => {
	const tRecord = t.record(t.number)
	type Record = t.TypeOf<typeof tRecord>

	it('should accept record', () => {
		expect(t.decode(tRecord, { a: 1, b: 2, z: 42 })).toEqual(t.ok({ a: 1, b: 2, z: 42 }))
	})

	it('should reject non record', () => {
		expect(t.decode(tRecord, [])).toBeErr()
	})

	it('should reject invalid field value', () => {
		expect(t.decode(tRecord, { a: 1, b: 2, x: 'x' })).toBeErr()
	})

	it('should print record type', () => {
		expect(tRecord.print()).toBe('Record<string, number>')
	})

	it('should print complex record type with parens', () => {
		expect(t.record(t.union(t.number, t.string)).print()).toBe('Record<string, (number | string)>')
	})
})

// vim: ts=4