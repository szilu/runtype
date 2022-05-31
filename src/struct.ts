import { Result, ok, err, isOk, isErr, RequiredKeys, OptionalKeys } from './utils'
import { Type, DecoderOpts, RTError, error } from './type'

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
				`${String(name)}${isOk(this.props[name].decode(undefined, {})) ? '?' : ''}: ${this.props[name].print()}`
			).join(', ')
			+ ' }'
	}

	checkExtraFields(struct: Record<keyof T, unknown>, opts: DecoderOpts) {
		let errors: RTError = []

		if (opts.unknownFields === 'drop' || opts.unknownFields === 'discard') return []
		for (const p of Object.getOwnPropertyNames(struct)) {
			//if (!this.props.hasOwnProperty(p)) errors.push(`${p}: unknown field`)
			if (!this.props.hasOwnProperty(p)) errors.push({ path: [p], error: 'unknown field' })
		}
		return errors
	}

	decode(u: unknown, opts: DecoderOpts): Result<
		{ [K in RequiredKeys<T>]: T[K] }
		& { [K in OptionalKeys<T>]?: T[K] },
		RTError
	> {
		if (typeof u !== 'object' || u === null) {
			return error('expected object')
		}

		const ret: { [K in keyof T]?: T[K] } = opts.unknownFields === 'discard' ? { ...u } : {}
		const struct: Record<keyof T, unknown> = u as any
		let errors: RTError = []

		// decode fields
		for (const p in this.props) {
			const res = this.props[p].decode(struct[p], opts)
			if (isOk(res)) {
				ret[p] = res.ok
			} else {
				//errors.push(`${p}: ${res.err}`)
				errors.push(...res.err.map(error => ({ path: [p, ...error.path], error: error.error })))
			}
		}
		// check extra fields
		errors.splice(-1, 0, ...this.checkExtraFields(struct, opts))
		//if (errors.length) return err(errors.join('\n'))
		if (errors.length) return err(errors)
		return ok(ret as { [K in keyof T]: T[K] })
	}

	async validate(v: T, opts: DecoderOpts) {
		const struct: T = v as any
		let errors: RTError = []
		for (const p in this.props) {
			const res = await this.props[p].validate(struct[p], opts)
			if (isErr(res)) {
				errors.push(...res.err.map(error => ({ path: [p, ...error.path], error: error.error })))
			}
		}
		if (errors.length) return err(errors)
		return this.validateBase(v, opts)
	}
}

export function struct<T extends { [K: string]: unknown }>(props: { [K in keyof T]: Type<T[K]> }): StructType<T> {
	return new StructType(props)
}

// FIXME: deprecated, remove later
export const type = struct

// vim: ts=4
