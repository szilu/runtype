import * as t from './index'
import './jest.local.ts'

declare global {
	namespace jest {
		interface Matchers<R> {
			toBeErr(pattern?: string): R;
		}
	}
}

describe('test tagged union type', () => {
	//const tTaggedUnion = t.taggedUnion('type', {
	const tTaggedUnion = t.taggedUnion('type')({
		num: t.struct({
			type: t.literal<['num']>('num'),
			n: t.number
		}),
		str: t.struct({
			type: t.literal<['str']>('str'),
			s: t.string
		})
	}).addValidator(v => v.type == 'num' ? t.ok(v) : t.error('error'))
	type TaggedUnion = t.TypeOf<typeof tTaggedUnion>

	// These are compile time tests for the TS type inference :)
	const union1: TaggedUnion = { type: 'num', n: 42 }
	const union2: TaggedUnion = { type: 'str', s: '42' }

	// Uncomment these to test TS type inference
	//const union3: TaggedUnion = { type: 'num', s: '42' }

	it('should accept comforming object', () => {
		expect(t.decode(tTaggedUnion, { type: 'num', n: 42 })).toEqual(t.ok({ type: 'num', n: 42 }))
	})

	it('should reject unknown tag', () => {
		expect(t.decode(tTaggedUnion, { type: 'bool'})).toBeErr()
	})

	it('should reject non-conforming member', () => {
		expect(t.decode(tTaggedUnion, { type: 'num', s: 'string'})).toBeErr()
	})

	it('should reject null', () => {
		expect(t.decode(tTaggedUnion, null)).toBeErr()
	})

	it('should print type', () => {
		expect(tTaggedUnion.print()).toBe('{ type: "num", n: number } | { type: "str", s: string }')
	})

	// validator
	it('should accept valid', async () => {
		expect(await t.validate(tTaggedUnion, { type: 'num', n: 42 })).toEqual(t.ok({ type: 'num', n: 42 }))
	})

	it('should reject in()', async () => {
		expect(await t.validate(tTaggedUnion, { type: 'str', s: '' })).toBeErr()
	})
})

// vim: ts=4
