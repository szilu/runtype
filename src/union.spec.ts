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
	const tLiteral = t.literal(1, 'a')
	type Literal = t.TypeOf<typeof tLiteral>

	const tStruct = t.struct({ n: t.number, s: t.optional(t.string) })
	type Struct = t.TypeOf<typeof tStruct>
	type PartialStruct = t.PartialTypeOf<typeof tStruct>
	type PatchStruct = t.PatchTypeOf<typeof tStruct>
	const struct1: Struct = { n: 42 }
	tStruct.decode
	tStruct.decodePartial
	tStruct.decodePatch

	const tSchema = t.struct({ field: t.number, subStruct: tStruct })
	type Schema = t.TypeOf<typeof tSchema>
	type PartialSchema = t.PartialTypeOf<typeof tSchema>
	type PatchSchema = t.PatchTypeOf<typeof tSchema>

	tSchema.decode
	tSchema.decodePartial
	tSchema.decodePatch

	const tOptional = t.optional(t.number)
	type Optional = t.TypeOf<typeof tOptional>
	const o1: Optional = 42
	const o2: Optional = undefined

	tOptional.decode

	// Uncomment these to test TS type inference
	//const o3: Optional = 'zizi'
	//const o4: Optional = null

	const tUnion = t.union(t.number, t.string, tStruct)
	type Union = t.TypeOf<typeof tUnion>

	const union: Union = 42
	//const union2: Union = { n: 42 }

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
