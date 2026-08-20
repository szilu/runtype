import * as t from './index.js'
import './jest.local.js'

declare global {
	namespace jest {
		interface Matchers<R> {
			toBeErr(pattern?: string): R
		}
	}
}

describe('test lazy type', () => {
	interface Struct {
		n: number
		s?: Struct
	}

	const tStruct: t.Type<Struct> = t.lazy(() =>
		t.struct({
			n: t.number,
			s: t.optional(tStruct)
		})
	)

	it('should accept correct type', () => {
		expect(t.decode(tStruct, { n: 42, s: { n: 42 } })).toEqual(t.ok({ n: 42, s: { n: 42 } }))
	})
	it('should print type', () => {
		expect(tStruct.print()).toBe('{ n: number, s?: ... | undefined }')
	})

	it('should run its own validators', async () => {
		const tChecked = t
			.lazy(() => t.number)
			.addValidator((v) => (v === 42 ? t.ok(v) : t.error('must be 42')))
		expect(await t.validate(tChecked, 42)).toEqual(t.ok(42))
		expect(await t.validate(tChecked, 1)).toBeErr()
		expect(t.validateSync(tChecked, 1)).toBeErr()
	})

	it('should print recursive types without infinite recursion', () => {
		let tNode: t.Type<any>
		tNode = t.lazy(() => t.struct({ v: t.number, children: t.array(tNode) }))
		const printed = tNode.print()
		expect(printed).toBe('{ v: number, children: ...[] }')
		// print() must be idempotent and side-effect free
		expect(tNode.print()).toBe(printed)
		expect(t.decode(tNode, { v: 1, children: [] })).toEqual(t.ok({ v: 1, children: [] }))
	})
})

// vim: ts=4
