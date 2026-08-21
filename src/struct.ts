import { LazyType } from './lazy.js'
import {
	acceptsUndefined,
	copyValidators,
	type DecoderOpts,
	DefaultType,
	error,
	NullableType,
	nullable,
	OptionalType,
	optional,
	type RTError,
	Type,
	withDefault
} from './type.js'
import { err, isErr, isOk, type OptionalKeys, ok, type RequiredKeys, type Result } from './utils.js'

// Struct //
////////////
export class StructType<T extends { [K: string]: unknown }> extends Type<
	{ [K in RequiredKeys<T>]: T[K] } & { [K in OptionalKeys<T>]?: T[K] }
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
		return (
			'{ ' +
			(Object.keys(this.props) as (keyof T)[])
				.map(
					(name) =>
						`${String(name)}${acceptsUndefined(this.props[name] as Type<unknown>) ? '?' : ''}: ${this.props[name].print()}`
				)
				.join(', ') +
			' }'
		)
	}

	decode(
		u: unknown,
		opts: DecoderOpts
	): Result<{ [K in RequiredKeys<T>]: T[K] } & { [K in OptionalKeys<T>]?: T[K] }, RTError> {
		if (typeof u !== 'object' || u === null || Array.isArray(u)) {
			return error('expected object')
		}

		const struct = u as Record<string, unknown>
		const ret: Record<string, unknown> = {}
		const errors: RTError = []

		// Decode known fields using cached keys
		for (const p of this._keys) {
			const key = p as string
			// Own keys only: a field named like an Object.prototype member (toString,
			// valueOf, constructor) would otherwise decode the inherited function.
			const present = Object.hasOwn(struct, key)
			const res = this.props[p].decode(present ? struct[key] : undefined, opts)
			if (isOk(res)) {
				// An absent optional field stays absent, so a decoded patch can be spread
				// over a stored record without wiping the fields it does not mention. An
				// explicitly supplied `undefined` is kept, so `{ k: undefined }` and `{}`
				// stay distinguishable.
				if (res.ok !== undefined || present) ret[key] = res.ok
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

		// Check unknown fields (skip if dropping). Own keys only, same rule as above:
		// an inherited enumerable prop is not the value's own data.
		if (opts.unknownFields !== 'drop' && opts.unknownFields !== 'discard') {
			for (const p in struct) {
				if (!this._keySet.has(p) && Object.hasOwn(struct, p)) {
					errors.push({ path: [p], error: 'unknown field' })
				}
			}
		} else if (opts.unknownFields === 'discard' && errors.length === 0) {
			// Copy unknown fields only on success
			for (const p in struct) {
				if (!this._keySet.has(p) && Object.hasOwn(struct, p)) {
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

	validateSync(v: T, opts: DecoderOpts) {
		this.checkSync()
		const struct = v as Record<string, unknown>
		const errors: RTError = []

		// Validate using cached keys
		for (const p of this._keys) {
			const key = p as string
			const res = this.props[p].validateSync(struct[key] as T[keyof T], opts)
			if (isErr(res)) {
				for (const e of res.err) {
					errors.push({
						path: e.path.length ? [key, ...e.path] : [key],
						error: e.error
					})
				}
			}
		}

		if (errors.length) return err(errors)
		return this.validateBaseSync(v, opts)
	}

	// No deepMap() override: processType() rebuilds structs via deepStruct(), which owns
	// the field-level policy. A second rebuild path here would only drift from it.
}

export function struct<T extends { [K: string]: unknown }>(
	props: { [K in keyof T]: Type<T[K]> }
): StructType<T> {
	return new StructType(props)
}

// The field is genuinely optional, ignoring any default. A DefaultType always accepts
// undefined, so asking it directly would misreport every defaulted field as optional.
function isOptionalField(type: Type<unknown>): boolean {
	return acceptsUndefined((type instanceof DefaultType ? type.type : type) as Type<unknown>)
}

// An absent field in a patch means "leave unchanged", not "reset to the default",
// so strip defaults wherever they sit - including under optional()/nullable().
function stripDefault(type: Type<unknown>): Type<unknown> {
	if (type instanceof DefaultType)
		return copyValidators(type, stripDefault(type.type as Type<unknown>))
	if (type instanceof OptionalType)
		return copyValidators(type, optional(stripDefault(type.type as Type<unknown>)))
	if (type instanceof NullableType)
		return copyValidators(type, nullable(stripDefault(type.type as Type<unknown>)))
	return type
}

// The shape-changing combinators below deliberately drop the source struct's own
// validators, but keep nested field ones. See "Validators on derived types" in README.md.

// Partial //
/////////////
export function partial<T extends { [K: string]: unknown }>(
	strct: StructType<T>
): StructType<Partial<T>> {
	const partialProps: Record<string, unknown> = {}
	for (const p in strct.props) {
		const type = strct.props[p] as Type<unknown>
		// A withDefault field is kept as-is so the default still applies.
		if (type) partialProps[p] = acceptsUndefined(type) ? type : optional(type)
	}
	return struct<Partial<T>>(partialProps as { [K in keyof Partial<T>]: Type<Partial<T>[K]> })
}

// Patch //
///////////
export type PatchField<T> = T extends undefined ? T | null : T | undefined
export type PatchStruct<T extends {}> = { [K in keyof T]?: PatchField<T[K]> }

export function patch<T extends { [K: string]: unknown }>(
	strct: StructType<T>
): StructType<PatchStruct<T>> {
	const patchProps: Record<string, unknown> = {}
	for (const p in strct.props) {
		const type = strct.props[p] as Type<unknown>
		if (!type) continue
		const base = stripDefault(type)
		patchProps[p] = isOptionalField(type) ? nullable(base) : optional(base)
	}
	return struct<PatchStruct<T>>(
		patchProps as { [K in keyof PatchStruct<T>]: Type<PatchStruct<T>[K]> }
	)
}

// Deep Partial //
//////////////////

// Conditional on a naked type parameter, so it DISTRIBUTES over unions - the runtime
// recurses into every union() and taggedUnion() member, and this keeps the inferred
// type in step. null/undefined fall through to `V` unchanged.
type DeepPartialValue<V> = V extends unknown[] | Date
	? V // Arrays, tuples and Date: kept as-is
	: V extends object
		? DeepPartial<V>
		: V // Primitives: kept as-is

export type DeepPartial<T> = {
	[K in keyof T]?: DeepPartialValue<T[K]>
} & {}

// Deep Patch //
////////////////
type DeepPatchValue<V> = V extends unknown[] | Date ? V : V extends object ? DeepPatchStruct<V> : V

export type DeepPatchStruct<T extends {}> = {
	[K in keyof T]?:
		| DeepPatchValue<NonNullable<T[K]>>
		| (undefined extends T[K] ? null : never)
		| undefined
} & {}

// The wrappers deepStruct() replaces with its own optional()/nullable() at struct-field level.
// DefaultType and LazyType also carry a `.type`, but neither may be unwrapped.
function isOptionalWrapper(
	type: Type<unknown>
): type is OptionalType<unknown> | NullableType<unknown> {
	return type instanceof OptionalType || type instanceof NullableType
}

type DeepMode = 'partial' | 'patch'

// Field-level *policy* lives in deepStruct(); structural recursion is delegated to
// Type.deepMap(), so a new combinator with child types is reached by overriding one
// method, not an instanceof chain.
//
// `lazyCache` closes recursive cycles: a LazyType maps to one stable wrapper, or every
// resolution builds a fresh one and the graph grows with data depth instead of looping
// back. One cache per top-level call, threaded through the rebuild, so a recursive type's
// second level points back at the first level's wrapper - a lazy() closing over the map
// that lives as long as the derived type.
function processType(
	type: Type<unknown>,
	mode: DeepMode,
	lazyCache: Map<Type<unknown>, Type<unknown>>
): Type<unknown> {
	const recurse = (t: Type<unknown>) => processType(t, mode, lazyCache)

	// 'patch' strips the default (an absent field means "leave unchanged", not "reset");
	// only struct-field level wraps, so a default nested in record()/union() is dropped.
	if (type instanceof DefaultType) {
		const inner = recurse(type.type as Type<unknown>)
		return mode === 'partial'
			? copyValidators(type, withDefault(inner, type.defaultValue))
			: copyValidators(type, inner)
	}

	// A nested struct is a field of the type being derived, so its own validators are
	// carried over - unlike the top-level struct's.
	if (type instanceof StructType) {
		const inner = deepStruct(type as StructType<Record<string, unknown>>, mode, lazyCache)
		return copyValidators(type, inner) as unknown as Type<unknown>
	}

	// The wrapper survives in BOTH modes - deepStruct() strips it only for a *direct*
	// struct field, where patch re-wraps with nullable()/optional(). Elsewhere (record(),
	// union(), intersection(), lazy()) it must survive or the derived type gets stricter.
	if (isOptionalWrapper(type)) {
		const inner = recurse(type.type as Type<unknown>)
		return copyValidators(
			type,
			type instanceof NullableType ? nullable(inner) : optional(inner)
		)
	}

	// Recurse on resolution, so the deferral - and with it a recursive type - is preserved.
	if (type instanceof LazyType) {
		const cached = lazyCache.get(type)
		if (cached) return cached
		const wrapped = type.deepMap(recurse)
		lazyCache.set(type, wrapped)
		return wrapped
	}

	// Everything else asks the type to rebuild itself. Types with no children (scalars)
	// and types deliberately preserved as-is (array, tuple) return themselves.
	return type.deepMap(recurse)
}

function deepStruct<T extends { [K: string]: unknown }>(
	strct: StructType<T>,
	mode: DeepMode,
	lazyCache: Map<Type<unknown>, Type<unknown>>
): StructType<Record<string, unknown>> {
	const props: Record<string, Type<unknown>> = {}

	for (const p in strct.props) {
		const type = strct.props[p] as Type<unknown>
		if (!type) continue

		if (mode === 'partial') {
			const processed = processType(type, mode, lazyCache)
			// Never probe a LazyType (resolving it re-enters the rebuild for a recursive type);
			// deepPartial() makes every field optional anyway. Ask the *processed* type, not the
			// source, so a withDefault field stays unwrapped and its default still applies.
			const tolerates = !(processed instanceof LazyType) && acceptsUndefined(processed)
			props[p] = tolerates ? processed : optional(processed)
		} else {
			// patch: optional fields -> nullable, required -> optional. The field's own
			// optional()/nullable() is stripped here (keeping its validators), not in
			// processType(), which must preserve every wrapper it meets deeper in the graph.
			const bare = isOptionalWrapper(type)
				? copyValidators(type, type.type as Type<unknown>)
				: type
			const processed = processType(bare, mode, lazyCache)
			props[p] = isOptionalField(type) ? nullable(processed) : optional(processed)
		}
	}

	return new StructType(props)
}

export function deepPartial<T extends { [K: string]: unknown }>(
	strct: StructType<T>
): StructType<DeepPartial<T>> {
	return deepStruct(strct, 'partial', new Map()) as unknown as StructType<DeepPartial<T>>
}

export function deepPatch<T extends { [K: string]: unknown }>(
	strct: StructType<T>
): StructType<DeepPatchStruct<T>> {
	return deepStruct(strct, 'patch', new Map()) as unknown as StructType<DeepPatchStruct<T>>
}

// Pick //
//////////
export function pick<T extends { [K: string]: unknown }, K extends keyof T>(
	strct: StructType<T>,
	keys: K[]
): StructType<Pick<T, K>> {
	const keySet = new Set<keyof T>(keys)
	const pickProps: Record<string, unknown> = {}
	for (const p in strct.props) {
		if (keySet.has(p)) pickProps[p] = strct.props[p]
	}
	return struct<Pick<T, K>>(pickProps as { [P in keyof Pick<T, K>]: Type<Pick<T, K>[P]> })
}

// Omit //
//////////
export function omit<T extends { [K: string]: unknown }, K extends keyof T>(
	strct: StructType<T>,
	keys: K[]
): StructType<Omit<T, K>> {
	const keySet = new Set<keyof T>(keys)
	const omitProps: Record<string, unknown> = {}
	for (const p in strct.props) {
		if (!keySet.has(p)) omitProps[p] = strct.props[p]
	}
	return struct<Omit<T, K>>(omitProps as { [P in keyof Omit<T, K>]: Type<Omit<T, K>[P]> })
}

// vim: ts=4
