import { Result, ok, err, isOk, RequiredKeys, OptionalKeys } from './utils'
import { Type, DecoderOpts } from './type'

// Struct //
////////////
export class StructType<T extends { [K: string]: unknown }> extends Type<
	{ [K in RequiredKeys<T>]: T[K] }
	& { [K in OptionalKeys<T>]?: T[K] }
> {
	props: { [K in keyof T]: Type<T[K]> }

	constructor(props: { [K in keyof T]: Type<T[K]> }) {
		super()
		this.props = props
	}

	print() {
		return '{ '
			+ (Object.keys(this.props) as (keyof T)[]).map(name =>
				`${name}${isOk(this.props[name].decode(undefined, {})) ? '?' : ''}: ${this.props[name].print()}`
			).join(', ')
			+ ' }'
	}

	checkExtraFields(struct: Record<keyof T, unknown>, opts: DecoderOpts) {
		let errors: string[] = []

		if (opts.unknownFields === 'drop' || opts.unknownFields === 'discard') return []
		for (const p of Object.getOwnPropertyNames(struct)) {
			if (!this.props.hasOwnProperty(p)) errors.push(`${p}: unknown field`)
		}
		return errors
	}

	decode(u: unknown, opts: DecoderOpts): Result<
		{ [K in RequiredKeys<T>]: T[K] }
		& { [K in OptionalKeys<T>]?: T[K] }
	> {
		if (typeof u !== 'object' || u === null) {
			return err('expected object')
		}

		const ret: { [K in keyof T]?: T[K] } = opts.unknownFields === 'discard' ? { ...u } : {}
		const struct: Record<keyof T, unknown> = u as any
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
		return ok(ret as { [K in keyof T]: T[K] })
	}
}

export function struct<T extends { [K: string]: unknown }>(props: { [K in keyof T]: Type<T[K]> }): StructType<T> {
	return new StructType(props)
}

// FIXME: deprecated, remove later
export const type = struct

// vim: ts=4
