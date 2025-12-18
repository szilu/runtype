import { Result, ok, err, isOk, isErr, RequiredKeys, OptionalKeys } from './utils.js'
import { Type, DecoderOpts, RTError, error, optional, nullable } from './type.js'

// Struct //
////////////
export class StructType<T extends { [K: string]: unknown }> extends Type<
	{ [K in RequiredKeys<T>]: T[K] }
	& { [K in OptionalKeys<T>]?: T[K] }
> {
	props: { [K in keyof T]: Type<T[K]> }
	private _keys: (keyof T)[]
	private _keySet: Set<string>

	constructor(props: { [K in keyof T]: Type<T[K]> }) {
		super()
		this.props = props
		this._keys = Object.keys(props) as (keyof T)[]
		this._keySet = new Set(this._keys as string[])
	}

	print() {
		return '{ '
			+ (Object.keys(this.props) as (keyof T)[]).map(name =>
				`${String(name)}${isOk(this.props[name].decode(undefined, {})) ? '?' : ''}: ${this.props[name].print()}`
			).join(', ')
			+ ' }'
	}

	decode(u: unknown, opts: DecoderOpts): Result<
		{ [K in RequiredKeys<T>]: T[K] }
		& { [K in OptionalKeys<T>]?: T[K] },
		RTError
	> {
		if (typeof u !== 'object' || u === null) {
			return error('expected object')
		}

		const struct = u as Record<string, unknown>
		const ret: Record<string, unknown> = {}
		const errors: RTError = []

		// Decode known fields using cached keys
		for (const p of this._keys) {
			const key = p as string
			const res = this.props[p].decode(struct[key], opts)
			if (isOk(res)) {
				ret[key] = res.ok
			} else {
				// Direct push without spread/map overhead
				for (const e of res.err) {
					errors.push({
						path: e.path.length ? [key, ...e.path] : [key],
						error: e.error
					})
				}
			}
		}

		// Check unknown fields (skip if dropping)
		if (opts.unknownFields !== 'drop' && opts.unknownFields !== 'discard') {
			for (const p in struct) {
				if (!this._keySet.has(p)) {
					errors.push({ path: [p], error: 'unknown field' })
				}
			}
		} else if (opts.unknownFields === 'discard' && errors.length === 0) {
			// Copy unknown fields only on success
			for (const p in struct) {
				if (!this._keySet.has(p)) {
					ret[p] = struct[p]
				}
			}
		}

		if (errors.length) return err(errors)
		return ok(ret as { [K in keyof T]: T[K] })
	}

	async validate(v: T, opts: DecoderOpts) {
		const struct = v as Record<string, unknown>
		const errors: RTError = []

		// Validate using cached keys
		for (const p of this._keys) {
			const key = p as string
			const res = await this.props[p].validate(struct[key] as T[keyof T], opts)
			if (isErr(res)) {
				// Direct push without spread/map overhead
				for (const e of res.err) {
					errors.push({
						path: e.path.length ? [key, ...e.path] : [key],
						error: e.error
					})
				}
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

// Deep Partial //
//////////////////
export type DeepPartial<T> = {
	[K in keyof T]?: NonNullable<T[K]> extends object
		? NonNullable<T[K]> extends any[] ? T[K]           // Arrays: keep as-is
		: NonNullable<T[K]> extends Date ? T[K]            // Date: keep as-is
		: DeepPartial<NonNullable<T[K]>> | Extract<T[K], null | undefined>  // Nested object: recurse, preserve nullability
		: T[K]                                // Primitives: keep as-is
} & {}

// Duck-type check for types with inner .type property (OptionalType, NullableType)
function hasInnerType(type: Type<any>): type is Type<any> & { type: Type<any> } {
	return 'type' in type && (type as any).type != null
}

function processTypeForDeepPartial(type: Type<any>): Type<any> {
	// StructType: recurse
	if (type instanceof StructType) {
		return deepPartial(type)
	}

	// Optional/Nullable wrapper: process inner type, re-wrap
	if (hasInnerType(type)) {
		const innerType = (type as any).type
		const processedInner = processTypeForDeepPartial(innerType)
		// Check if nullable (accepts null) or just optional
		if (isOk(type.decode(null, {}))) {
			return nullable(processedInner)
		} else {
			return optional(processedInner)
		}
	}

	// Arrays, records, unions, etc: return as-is
	return type
}

export function deepPartial<T extends { [K: string]: unknown }>(
	strct: StructType<T>
): StructType<DeepPartial<T>> {
	const deepPartialProps: { [K in keyof T]?: Type<any> } = {}

	for (const p in strct.props) {
		const type = strct.props[p]
		if (!type) continue

		const processedType = processTypeForDeepPartial(type)
		deepPartialProps[p] = isOk(processedType.decode(undefined, {}))
			? processedType
			: optional(processedType)
	}

	return struct(deepPartialProps as any) as StructType<DeepPartial<T>>
}

// Deep Patch //
////////////////
export type DeepPatchStruct<T extends {}> = {
	[K in keyof T]?: (
		NonNullable<T[K]> extends object
			? NonNullable<T[K]> extends any[] | Date
				? NonNullable<T[K]>
				: DeepPatchStruct<NonNullable<T[K]>>
			: NonNullable<T[K]>
	) | (undefined extends T[K] ? null : never) | undefined
} & {}

function processTypeForDeepPatch(type: Type<any>): Type<any> {
	if (type instanceof StructType) {
		return deepPatch(type)
	}

	if (hasInnerType(type)) {
		const innerType = (type as any).type
		return processTypeForDeepPatch(innerType)
	}

	return type
}

export function deepPatch<T extends { [K: string]: unknown }>(
	strct: StructType<T>
): StructType<DeepPatchStruct<T>> {
	const deepPatchProps: { [K in keyof T]?: Type<any> } = {}

	for (const p in strct.props) {
		const type = strct.props[p]
		if (!type) continue

		const processedType = processTypeForDeepPatch(type)

		// Patch wrapping: optional fields -> nullable, required -> optional
		if (isOk(type.decode(undefined, {}))) {
			deepPatchProps[p] = nullable(processedType)
		} else {
			deepPatchProps[p] = optional(processedType)
		}
	}

	return struct(deepPatchProps as any) as StructType<DeepPatchStruct<T>>
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
