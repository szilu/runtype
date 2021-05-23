import * as t from './index'
import './jest.local.ts'

declare global {
	namespace jest {
		interface Matchers<R> {
			toBeErr(pattern?: string): R;
		}
	}
}

describe('test union type', () => {
	const tStruct = t.struct({ n: t.number, s: t.optional(t.string) })
	type Struct = t.TypeOf<typeof tStruct>
	type PartialStruct = t.PartialTypeOf<typeof tStruct>
	type PatchStruct = t.PatchTypeOf<typeof tStruct>

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
		expect(tUnion.decode(42)).toEqual(t.ok(42))
	})

	it('should accept comforming object', () => {
		expect(tUnion.decode({ n: 42 })).toEqual(t.ok({ n: 42 }))
	})

	it('should reject null', () => {
		expect(tUnion.decode(null)).toBeErr()
	})

	it('should reject empty object', () => {
		expect(tUnion.decode({})).toBeErr()
	})

	it('should print type', () => {
		expect(tUnion.print()).toBe('number | string | { n: number, s?: string | undefined }')
	})
})

// vim: ts=4
