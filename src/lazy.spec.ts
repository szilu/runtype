import * as t from './index.js'
import './jest.local.js'

declare global {
	namespace jest {
		interface Matchers<R> {
			toBeErr(pattern?: string): R;
		}
	}
}

describe('test lazy type', () => {
	interface Struct {
		n: number
		s?: Struct
	}

	const tStruct:t.Type<Struct> = t.lazy(() => t.struct({
		n: t.number,
		s: t.optional(tStruct)
	}))

	it('should accept correct type', () => {
		expect(t.decode(tStruct, { n: 42, s: { n: 42 } })).toEqual(t.ok({ n: 42, s: { n: 42 } }))
	})
	it('should print type', () => {
		expect(tStruct.print()).toBe('FIXME_Lazy_print_not_implemented')
	})
})

// vim: ts=4
