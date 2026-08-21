import * as t from './index.js'
import './jest.local.js'

declare global {
	namespace jest {
		interface Matchers<R> {
			toBeErr(pattern?: string): R
		}
	}
}

describe('test tagged union type', () => {
	//const tTaggedUnion = t.taggedUnion('type', {
	const tTaggedUnion = t
		.taggedUnion('type')({
			num: t.struct({
				type: t.literal<['num']>('num'),
				n: t.number
			}),
			str: t.struct({
				type: t.literal<['str']>('str'),
				s: t.string
			})
		})
		.addValidator((v) => (v.type == 'num' ? t.ok(v) : t.error('error')))
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
		expect(t.decode(tTaggedUnion, { type: 'bool' })).toBeErr()
	})

	it('should report a falsy tag as unknown, not missing', () => {
		expect(t.decode(tTaggedUnion, { type: '' })).toBeErr('unknown tag')
		expect(t.decode(tTaggedUnion, {})).toBeErr('missing tag')
		expect(t.decode(tTaggedUnion, { type: undefined })).toBeErr('missing tag')
	})

	it('should reject a non-primitive tag instead of throwing', () => {
		expect(t.decode(tTaggedUnion, { type: Object.create(null) })).toBeErr('invalid tag')
		expect(t.decode(tTaggedUnion, { type: {} })).toBeErr('invalid tag')
		expect(t.decode(tTaggedUnion, { type: [] })).toBeErr('invalid tag')
		expect(t.decode(tTaggedUnion, { type: Symbol('num') })).toBeErr('invalid tag')
	})

	it('should reject non-conforming member', () => {
		expect(t.decode(tTaggedUnion, { type: 'num', s: 'string' })).toBeErr()
	})

	it('should reject null', () => {
		expect(t.decode(tTaggedUnion, null)).toBeErr()
	})

	it('should reject array', () => {
		expect(t.decode(tTaggedUnion, Object.assign([], { type: 'num', n: 42 }))).toBeErr()
	})

	it('should print type', () => {
		expect(tTaggedUnion.print()).toBe('{ type: "num", n: number } | { type: "str", s: string }')
	})

	// validator
	it('should accept valid', async () => {
		expect(await t.validate(tTaggedUnion, { type: 'num', n: 42 })).toEqual(
			t.ok({ type: 'num', n: 42 })
		)
	})

	it('should reject in()', async () => {
		expect(await t.validate(tTaggedUnion, { type: 'str', s: '' })).toBeErr()
	})

	it('should reject unknown tag in validate()', async () => {
		expect(
			await tTaggedUnion.validate({ type: 'bool' } as unknown as TaggedUnion, {})
		).toBeErr()
	})

	it('should reject unknown tag in validateSync()', () => {
		expect(tTaggedUnion.validateSync({ type: 'bool' } as unknown as TaggedUnion, {})).toBeErr()
	})

	it('should reject null/undefined in validate()', async () => {
		expect(await tTaggedUnion.validate(null as unknown as TaggedUnion, {})).toBeErr()
		expect(await tTaggedUnion.validate(undefined as unknown as TaggedUnion, {})).toBeErr()
	})

	it('should reject null/undefined in validateSync()', () => {
		expect(tTaggedUnion.validateSync(null as unknown as TaggedUnion, {})).toBeErr()
		expect(tTaggedUnion.validateSync(undefined as unknown as TaggedUnion, {})).toBeErr()
	})
})

// vim: ts=4
