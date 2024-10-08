import { Result, ok, err, isOk, isErr, RequiredKeys, OptionalKeys } from './utils.js'
import { Type, DecoderOpts, RTError, error } from './type.js'
import { optional } from './optional.js'
import { nullable } from './nullable.js'

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

// Partial //
/////////////
export function partial<T extends { [K: string]: unknown }>(strct: StructType<T>): StructType<Partial<T>> {
	const partialProps: { [K in keyof T]?: Type<T[K] | undefined> } = {}
	for (const p in strct.props) {
		const type = strct.props[p] as any
		if (type) partialProps[p] = isOk(type.decode(undefined, {})) ? type : optional(type)
	}
	return struct(partialProps as any) as StructType<Partial<T>>
}

// Patch //
///////////
export type PatchField<T> = T extends undefined ? T | null : T | undefined
export type PatchStruct<T extends {}> = { [K in keyof T]?: PatchField<T[K]> }

export function patch<T extends { [K: string]: unknown }>(strct: StructType<T>): StructType<PatchStruct<T>> {
	const patchProps: { [K in keyof T]?: PatchField<Type<T[K]>> } = {}
	for (const p in strct.props) {
		const type = strct.props[p] as any
		if (type) patchProps[p] = isOk(type.decode(undefined, {})) ? nullable(type) : optional(type) as any
	}
	return struct(patchProps as any) as StructType<PatchStruct<T>>
}

// Pick //
//////////
export function pick<T extends { [K: string]: unknown }, K extends keyof T>(strct: StructType<T>, keys: K[]): StructType<Pick<T, K>> {
	const pickProps: { [K in keyof T]?: Type<T[K]> } = {}
	for (const p in strct.props) {
		if (keys.includes(p as any)) pickProps[p] = strct.props[p]
	}
	return struct(pickProps as any) as StructType<Pick<T, K>>
}

// Omit //
//////////
export function omit<T extends { [K: string]: unknown }, K extends keyof T>(strct: StructType<T>, keys: K[]): StructType<Omit<T, K>> {
	const omitProps: { [K in keyof T]?: Type<T[K]> } = {}
	for (const p in strct.props) {
		if (!keys.includes(p as any)) omitProps[p] = strct.props[p]
	}
	return struct(omitProps as any) as StructType<Omit<T, K>>
}

// FIXME: deprecated, remove later
export const type = struct

// vim: ts=4
