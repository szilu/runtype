import * as t from './index.js'
import './jest.local.js'

declare global {
	namespace jest {
		interface Matchers<R> {
			toBeErr(pattern?: string): R;
		}
	}
}

describe('test complex types', () => {
	// Define a complex type
	const tComplex = t.struct({
		s: t.string,
		n: t.number,
		b: t.optional(t.boolean),
		a: t.optional(
			t.array(
				t.tuple(
					t.string,
					t.union(
						t.boolean, t.nullable(t.number.between(0, 100))
					)
				)
			)
		)
	})

	type Complex = t.TypeOf<typeof tComplex>
	type PartialComplex = t.PartialTypeOf<typeof tComplex>
	type PatchComplex = t.PatchTypeOf<typeof tComplex>

	// These are compile time tests for the TS type inference :)
	const complex1: Complex = {
		s: 'string',
		n: 42,
		b: true,
		a: [
			[
				'string',
				42
			]
		]
	}
	// Uncomment these to test TS type inference
	/*
	const complex2: Complex = {
		s: 'string',
		n: 42,
		b: true,
		a: [
			[
				'string',
				'42'
			]
		]
	}
	*/

	describe('test complex types', () => {
		it('should accept', () => {
			expect(t.decode(tComplex, {
				s: 'string',
				n: 42,
				b: true,
				a: [
					[
						'string',
						42
					]
				]
			})).toEqual(t.ok({
				s: 'string',
				n: 42,
				b: true,
				a: [
					[
						'string',
						42
					]
				]
			}))
		})

		it('should reject deep', () => {
			expect(t.decode(tComplex, {
				s: 'string',
				n: 42,
				b: true,
				a: [
					[
						'string',
						'42'
					]
				]
			})).toBeErr()
		})

		it('should recursively handle DecoderOpts', () => {
			expect(t.decode(tComplex, {
				s: 'string',
				n: 42,
				b: true,
				a: [
					[
						'string',
						'42'
					]
				]
			}, { coerceStringToNumber: true })).toEqual(t.ok({
				s: 'string',
				n: 42,
				b: true,
				a: [
					[
						'string',
						42
					]
				]
			}))
		})

		it('should accept deep between() validator', async () => {
			expect(await t.validate(tComplex, {
				s: 'string',
				n: 42,
				a: [
					[
						'string',
						42
					]
				]
			})).toEqual(t.ok({
				s: 'string',
				n: 42,
				a: [
					[
						'string',
						42
					]
				]
			}))
		})

		it('should reject deep between() validator', async () => {
			expect(await t.validate(tComplex, {
				s: 'string',
				n: 42,
				a: [
					[
						'string',
						142
					]
				]
			})).toBeErr()
		})
	})
})

// vim: ts=4
