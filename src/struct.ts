import { Result, ok, err, isOk, isErr, RequiredKeys, OptionalKeys } from './utils'
import { Type, DecoderOpts } from './type'

// Struct //
////////////
export class StructType<S> extends Type<
	{ [K in RequiredKeys<S>]: S[K] }
	& { [K in OptionalKeys<S>]?: S[K] }
> {
	props: { [K in keyof S]: Type<S[K]> }

	constructor(props: { [K in keyof S]: Type<S[K]> }) {
		super()
		this.props = props
	}

	print() {
		return '{ '
			+ (Object.keys(this.props) as (keyof S)[]).map(name =>
				`${name}${isOk(this.props[name].decode(undefined, {})) ? '?' : ''}: ${this.props[name].print()}`
			).join(', ')
			+ ' }'
	}

	checkExtraFields(struct: Record<keyof S, unknown>, opts: DecoderOpts) {
		let errors: string[] = []

		if (opts.unknownFields === 'drop' || opts.unknownFields === 'discard') return []
		for (const p of Object.getOwnPropertyNames(struct)) {
			if (!this.props.hasOwnProperty(p)) errors.push(`${p}: unknown field`)
		}
		return errors
	}

	decode(u: unknown, opts: DecoderOpts): Result<
		{ [K in RequiredKeys<S>]: S[K] }
		& { [K in OptionalKeys<S>]?: S[K] }
	> {
		if (typeof u !== 'object' || u === null) {
			return err('expected object')
		}

		const ret: { [K in keyof S]?: S[K] } = opts.unknownFields === 'discard' ? { ...u } : {}
		const struct: Record<keyof S, unknown> = u as any
		let errors: string[] = []

		// decode fields
		for (const p in this.props) {
			const res = this.props[p].decode(struct[p], opts)
			if (isOk(res)) {
				ret[p] = res.ok
			} else {
				errors.push(`${p}: ${res.err}`)
			}
		}
		// check extra fields
		errors.splice(-1, 0, ...this.checkExtraFields(struct, opts))
		if (errors.length) return err(errors.join('\n'))
		return ok(ret as { [K in keyof S]: S[K] })
	}

	decodePartial(u: unknown, opts: DecoderOpts): Result<{ [K in keyof S]?: S[K] | undefined }> {
		if (typeof u !== 'object' || u === null) {
			return err('expected object')
		}

		const ret: { [K in keyof S]?: S[K] } = opts.unknownFields === 'discard' ? { ...u } : {}
		const struct: Record<keyof S, unknown> = u as any
		let errors: string[] = []

		// decode fields
		for (const p in this.props) {
			const res = (struct[p] as any) === undefined ? ok(undefined) : this.props[p].decode(struct[p], opts)
			if (isOk(res)) {
				ret[p] = res.ok
			} else {
				errors.push(`${p}: ${res.err}`)
			}
		}
		// check extra fields
		errors.splice(-1, 0, ...this.checkExtraFields(struct, opts))
		if (errors.length) return err(errors.join('\n'))
		return ok(ret as { [K in keyof S]?: S[K] })
	}

	decodePatch(u: unknown, opts: DecoderOpts): Result<
		{ [K in RequiredKeys<S>]?: S[K] | undefined }
		& { [K in OptionalKeys<S>]?: S[K] | null | undefined }
	> {
		if (typeof u !== 'object' || u === null) {
			return err('expected object')
		}

		const ret: { [K in keyof S]?: S[K] | null } = opts.unknownFields === 'discard' ? { ...u } : {}
		const struct: Record<keyof S, unknown> = u as any
		let errors: string[] = []

		// decode fields
		for (const p in this.props) {
			let res
			if (isOk(this.props[p].decode(undefined, opts))) {
				// optional field => accept undefined and null
				res = (struct[p] as any) === undefined ? ok(undefined)
					: (struct[p] as any) === null ? ok(null)
					: this.props[p].decode(struct[p], opts)
			} else {
				// required field => accept only undefined
				res = (struct[p] as any) === undefined ? ok(undefined)
					: this.props[p].decode(struct[p], opts)
			}
			if (isOk(res)) {
				ret[p] = res.ok
			} else {
				errors.push(`${p}: ${res.err}`)
			}
		}
		// check extra fields
		errors.splice(-1, 0, ...this.checkExtraFields(struct, opts))
		if (errors.length) return err(errors.join('\n'))
		return ok(ret as { [K in RequiredKeys<S>]?: S[K] | undefined } & { [K in OptionalKeys<S>]?: S[K] | null | undefined })
	}
}

export function struct<S>(props: { [K in keyof S]: Type<S[K]> }): StructType<S> {
	return new StructType(props)
}

// FIXME: deprecated, remove later
export const type = struct

export type PartialTypeOf<D> = D extends { decodePartial: (u: unknown, opts: DecoderOpts) => Result<infer T> } ? T : never
export type PatchTypeOf<D> = D extends { decodePatch: (u: unknown, opts: DecoderOpts) => Result<infer T> } ? T : never

export function decodePartial<S>(type: StructType<S>, value: unknown, opts: DecoderOpts = {}): Result<{ [K in keyof S]?: S[K] | undefined }> {
	return type.decodePartial(value, opts)
}

export function decodePatch<S>(type: StructType<S>, value: unknown, opts: DecoderOpts = {}): Result<
	{ [K in RequiredKeys<S>]?: S[K] | undefined }
	& { [K in OptionalKeys<S>]?: S[K] | null | undefined }
> {
	return type.decodePatch(value, opts)
}

// vim: ts=4
