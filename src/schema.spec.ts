import * as t from './index'
import './jest.local.ts'

declare global {
	namespace jest {
		interface Matchers<R> {
			toBeErr(pattern?: string): R;
		}
	}
}

describe('test schema type', () => {
	// Schema
	const sk = t.schema({
		ik: { type: { ts: t.integer }},
		sk: { type: { ts: t.string }},
		n: { type: { ts: t.number }},
		b: { type: { ts: t.optional(t.boolean) }}
	}, ['sk', 'ik'], 'ik')

	const tStrict = t.schemaStrict(sk)
	type Strict = t.TypeOf<typeof tStrict>

	const tPartial = t.schemaPartial(sk)
	type Partial = t.TypeOf<typeof tPartial>

	const tPatch = t.schemaPatch(sk)
	type Patch = t.TypeOf<typeof tPatch>

	const tPost = t.schemaPost(sk)
	type Post = t.TypeOf<typeof tPost>

	const tEditPost = t.schemaEditPost(sk)
	type EditPost = t.TypeOf<typeof tEditPost>

	const tKeys = t.schemaKeys(sk)
	type Keys = t.TypeOf<typeof tKeys>

	// COMPILE TIME TESTS for the TS type inference :)
	const strict1: Strict = { ik: 1, sk: 'string', n: 42, b: true }
	const strict2: Strict = { ik: 2, sk: 'string', n: 42 }

	const partial1: Partial = { ik: 2, sk: 'string' }

	const patch1: Patch = { ik: 1, sk: 'string', n: 42, b: null }

	const post1: Post = { sk: 'string', n: 42, b: true }

	const editPost1: EditPost = { sk: 'string', n: 42, b: true }

	const keys: Keys = { ik: 42, sk: 'string' }

	// Uncomment these to test TS type inference
	//const strictErr1: Schema = { ik: 3, sk: 'string', n: 42, b: 42 }
	//const patchErr1: Patch = { ik: 1, sk: 'string', n: 42, b: true }
	//const postErr1: Post = { ik: 1, sk: 'string', n: 42, b: true }
	//const keysErr1: Keys = { ik: 42, sk: 'string', n: 42 }

	describe('test Strict schema type', () => {
		it('should accept', () => {
			expect(t.decode(tStrict, { ik: 1, sk: 'string', n: 42, b: true })).toEqual(t.ok({ ik: 1, sk: 'string', n: 42, b: true }))
		})

		it('should reject scalar', () => {
			expect(t.decode(tStrict, 42)).toBeErr()
		})

		it('should reject null', () => {
			expect(t.decode(tStrict, null)).toBeErr()
		})

		it('should reject array', () => {
			expect(t.decode(tStrict, [42])).toBeErr()
		})

		it('should reject invalid field value', () => {
			expect(t.decode(tStrict, { ik: 1, sk: 'string', n: '42', b: true })).toBeErr()
		})

		it('should reject missing field', () => {
			expect(t.decode(tStrict, { ik: 1, sk: 'string', b: true })).toBeErr()
		})

		it('should reject extra field', () => {
			expect(t.decode(tStrict, { ik: 1, sk: 'string', n: 42, b: true, e: 'extra' })).toBeErr()
		})

		it('should accept extra field with opt', () => {
			expect(t.decode(tStrict, { ik: 1, sk: 'string', n: 42, b: true, e: 'extra' }, { unknownFields: 'discard' })).toEqual(t.ok({ ik: 1, sk: 'string', n: 42, b: true, e: 'extra' }))
		})

		it('should drop extra field with opt', () => {
			expect(t.decode(tStrict, { ik: 1, sk: 'string', n: 42, b: true, e: 'extra' }, { unknownFields: 'drop' })).toEqual(t.ok({ ik: 1, sk: 'string', n: 42, b: true }))
		})
	})

	describe('test Partial schema type', () => {
		it('should accept', () => {
			expect(t.decode(tPartial, { ik: 1, sk: 'string', n: 42, b: true })).toEqual(t.ok({ ik: 1, sk: 'string', n: 42, b: true }))
		})

		it('should reject invalid field value', () => {
			expect(t.decode(tPartial, { ik: 1, sk: 'string', n: 'string', b: true })).toBeErr()
		})

		it('should reject null field value', () => {
			expect(t.decode(tPartial, { ik: 1, sk: 'string', n: null, b: true })).toBeErr()
		})

		it('should accept missing field', () => {
			expect(t.decode(tPartial, { ik: 1, sk: 'string', b: true })).toEqual(t.ok({ ik: 1, sk: 'string', b: true }))
		})

		it('should reject extra field', () => {
			expect(t.decode(tPartial, { ik: 1, sk: 'string', n: 42, b: true, e: 'extra' })).toBeErr()
		})
	})

	describe('test Patch schema type', () => {
		it('should accept', () => {
			expect(t.decode(tPatch, { ik: 1, sk: 'string', n: 42, b: true })).toEqual(t.ok({ ik: 1, sk: 'string', n: 42, b: true }))
		})

		it('should reject invalid field value', () => {
			expect(t.decode(tPatch, { ik: 1, sk: 'string', n: 'string', b: true })).toBeErr()
		})

		it('should accept missing optional field', () => {
			expect(t.decode(tPatch, { ik: 1, sk: 'string', n: 42 })).toEqual(t.ok({ ik: 1, sk: 'string', n: 42 }))
		})

		it('should accept missing required field', () => {
			expect(t.decode(tPatch, { ik: 1, sk: 'string', b: true })).toEqual(t.ok({ ik: 1, sk: 'string', b: true }))
		})

		it('should accept null value in optional field', () => {
			expect(t.decode(tPatch, { ik: 1, sk: 'string', n: 42, b: null })).toEqual(t.ok({ ik: 1, sk: 'string', n: 42, b: null }))
		})

		it('should reject null value in required field', () => {
			expect(t.decode(tPatch, { ik: 1, sk: 'string', n: null, b: true })).toBeErr()
		})

		it('should reject extra field', () => {
			expect(t.decode(tPatch, { ik: 1, sk: 'string', n: 42, b: true, e: 'extra' })).toBeErr()
		})
	})

	describe('test Post schema type', () => {
		it('should accept struct without genKey', () => {
			expect(t.decode(tPost, { sk: 'string', n: 42, b: true })).toEqual(t.ok({ sk: 'string', n: 42, b: true }))
		})

		it('should reject struct with key', () => {
			expect(t.decode(tPost, { ik: 1, sk: 'string', n: 42, b: true })).toBeErr()
		})
	})

	describe('test Post schema type', () => {
		it('should accept struct without genKey', () => {
			expect(t.decode(tEditPost, { sk: 'string', n: 42, b: true })).toEqual(t.ok({ sk: 'string', n: 42, b: true }))
		})

		it('should reject struct with key', () => {
			expect(t.decode(tEditPost, { ik: 1, sk: 'string', n: 42, b: true })).toBeErr()
		})
	})

	describe('test Keys schema type', () => {
		it('should accept struct with keys', () => {
			expect(t.decode(tKeys, { ik: 42, sk: 'string' })).toEqual(t.ok({ ik: 42, sk: 'string' }))
		})

		it('should reject non-key field', () => {
			expect(t.decode(tKeys, { ik: 1, sk: 'string', n: 42 })).toBeErr()
		})

		it('should reject struct with missing key field', () => {
			expect(t.decode(tKeys, { ik: 1 })).toBeErr()
		})
	})
})

// vim: ts=4
