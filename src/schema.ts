import { Result, ok, err, isOk, isErr, RequiredKeys, OptionalKeys, Narrow } from './utils'
import { Type, DecoderOpts } from './type'
import * as t from './index'
import { Validator } from './validator'

export interface FieldType<T> {
	ts: t.Type<T>
	valid?: Validator<Exclude<T, undefined>>
}

interface FieldDesc<T> {
	type: FieldType<T>
	valid?: Validator<Exclude<T, undefined>>
}

export interface Schema<T extends { [K: string]: unknown }, KEYS extends keyof T, GK extends KEYS> {
	genKey?: GK
	keys: KEYS[]
	props: { [K in keyof T]: FieldDesc<T[K]> }
}

export function schema<T extends { [K: string]: unknown }, KEYS extends keyof T, GK extends KEYS>(
	props: { [P in keyof T]: FieldDesc<T[P]> },
	// keys: Narrow<KEYS>[] = [],
	keys: KEYS[] = [],
	// genKey?: Narrow<GK>
	genKey?: GK
): Schema<T, KEYS, GK> {
	return { genKey, keys, props }
}

////////////
// TypeOf //
////////////
export type StrictTypeOf<S> = S extends Schema<infer T, infer KEYS, infer GK>
	? { [K in RequiredKeys<T>]: T[K] } & { [K in OptionalKeys<T>]?: T[K] }
	: never
export type PartialTypeOf<S> = S extends Schema<infer T, infer KEYS, infer GK>
	? { [K in keyof T]?: T[K] | undefined }
	: never
export type PatchTypeOf<S> = S extends Schema<infer T, infer KEYS, infer GK>
	? { [K in RequiredKeys<T>]?: T[K] | undefined } & { [K in OptionalKeys<T>]?: T[K] | null | undefined }
	: never
export type PostTypeOf<S> = S extends Schema<infer T, infer KEYS, infer GK>
	? { [K in Exclude<RequiredKeys<T>, GK>]: T[K] } & { [K in Exclude<OptionalKeys<T>, GK>]?: T[K] }
	: never
export type PostPartialTypeOf<S> = S extends Schema<infer T, infer KEYS, infer GK>
	? { [K in Exclude<keyof T, GK>]?: T[K] | undefined }
	: never
export type KeysTypeOf<S> = S extends Schema<infer T, infer KEYS, infer GK>
	? { [K in KEYS]: T[K] }
	: never

////////////////////////
// Strict Schema Type //
////////////////////////
// - every prop strict checked
//
export class SchemaStrictType<T extends { [K: string]: unknown }, KEYS extends keyof T, GK extends KEYS> extends Type<
	{ [K in RequiredKeys<T>]: T[K] } & { [K in OptionalKeys<T>]?: T[K] }
> {
	schema: Schema<T, KEYS, GK>

	constructor(schema: Schema<T, KEYS, GK>) {
		super()
		this.schema = schema
	}

	print() {
		const props = this.schema.props
		return '{ '
			+ (Object.keys(props) as (keyof T)[]).map(name =>
				`${name}${isOk(props[name].type.ts.decode(undefined, {})) ? '?' : ''}: ${props[name].type.ts.print()}`
			).join(', ')
			+ ' }'
	}

	checkExtraFields(struct: Record<keyof T, unknown>, opts: DecoderOpts) {
		let errors: string[] = []

		if (opts.unknownFields === 'drop' || opts.unknownFields === 'discard') return []
		for (const p of Object.getOwnPropertyNames(struct)) {
			if (!this.schema.props.hasOwnProperty(p)) errors.push(`${p}: unknown field`)
		}
		return errors
	}

	decode(u: unknown, opts: DecoderOpts): Result<
		{ [K in RequiredKeys<T>]: T[K] } & { [K in OptionalKeys<T>]?: T[K] }
	> {
		if (typeof u !== 'object' || u === null) {
			return err('expected object')
		}

		const ret: { [K in keyof T]?: T[K] } = opts.unknownFields === 'discard' ? { ...u } : {}
		const struct: Record<keyof T, unknown> = u as any
		let errors: string[] = []
		const props = this.schema.props

		// decode fields
		for (const p in props) {
			const res = props[p].type.ts.decode(struct[p], opts)
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

export function schemaStrict<T extends { [K: string]: unknown }, KEYS extends keyof T, GK extends KEYS>(schema: Schema<T, KEYS, GK>): SchemaStrictType<T, KEYS, GK> {
	return new SchemaStrictType(schema)
}

/////////////////////////
// Partial Schema Type //
/////////////////////////
// - keys:			value | undefined
// - required fields: value | undefined
// - optional fields: value | undefined
//
export class SchemaPartialType<T extends { [K: string]: unknown }, KEYS extends keyof T, GK extends KEYS> extends Type<{ [K in keyof T]?: T[K] | undefined }> {
	schema: Schema<T, KEYS, GK>

	constructor(schema: Schema<T, KEYS, GK>) {
		super()
		this.schema = schema
	}

	print() {
		const props = this.schema.props
		return '{ '
			+ (Object.keys(props) as (keyof T)[]).map(name =>
				`${name}?: ${props[name].type.ts.print()}`
			).join(', ')
			+ ' }'
	}

	checkExtraFields(struct: Record<keyof T, unknown>, opts: DecoderOpts) {
		let errors: string[] = []

		if (opts.unknownFields === 'drop' || opts.unknownFields === 'discard') return []
		for (const p of Object.getOwnPropertyNames(struct)) {
			if (!this.schema.props.hasOwnProperty(p)) errors.push(`${p}: unknown field`)
		}
		return errors
	}

	decode(u: unknown, opts: DecoderOpts): Result<{ [K in keyof T]?: T[K] | undefined }> {
		if (typeof u !== 'object' || u === null) {
			return err('expected object')
		}

		const ret: { [K in keyof T]?: T[K] } = opts.unknownFields === 'discard' ? { ...u } : {}
		const struct: Record<keyof T, unknown> = u as any
		let errors: string[] = []
		const props = this.schema.props

		// decode fields
		for (const p in props) {
			const res = (struct[p] as any) === undefined ? ok(undefined) : props[p].type.ts.decode(struct[p], opts)
			if (isOk(res)) {
				ret[p] = res.ok
			} else {
				errors.push(`${p}: ${res.err}`)
			}
		}
		// check extra fields
		errors.splice(-1, 0, ...this.checkExtraFields(struct, opts))
		if (errors.length) return err(errors.join('\n'))
		return ok(ret as { [K in keyof T]?: T[K] })
	}
}

export function schemaPartial<T extends { [K: string]: unknown }, KEYS extends keyof T, GK extends KEYS>(schema: Schema<T, KEYS, GK>): SchemaPartialType<T, KEYS, GK> {
	return new SchemaPartialType(schema)
}

///////////////////////
// Patch Schema Type //
///////////////////////
// - keys:			required
// - required fields: value | undefined
// - optional fields: value | null | undefined
//
export class SchemaPatchType<T extends { [K: string]: unknown }, KEYS extends keyof T, GK extends KEYS> extends Type<
	{ [K in RequiredKeys<T>]?: T[K] | undefined } & { [K in OptionalKeys<T>]?: T[K] | null | undefined }
> {
	schema: Schema<T, KEYS, GK>

	constructor(schema: Schema<T, KEYS, GK>) {
		super()
		this.schema = schema
	}

	print() {
		const props = this.schema.props
		return '{ '
			+ (Object.keys(props) as (keyof T)[]).map(name =>
				`${name}?: ${props[name].type.ts.print()}${isOk(props[name].type.ts.decode(undefined, {})) ? ' | null' : ''}`
			).join(', ')
			+ ' }'
	}

	checkExtraFields(struct: Record<keyof T, unknown>, opts: DecoderOpts) {
		let errors: string[] = []

		if (opts.unknownFields === 'drop' || opts.unknownFields === 'discard') return []
		for (const p of Object.getOwnPropertyNames(struct)) {
			if (!this.schema.props.hasOwnProperty(p)) errors.push(`${p}: unknown field`)
		}
		return errors
	}

	decode(u: unknown, opts: DecoderOpts): Result<
		{ [K in RequiredKeys<T>]?: T[K] | undefined }
		& { [K in OptionalKeys<T>]?: T[K] | null | undefined }
	> {
		if (typeof u !== 'object' || u === null) {
			return err('expected object')
		}

		const ret: { [K in keyof T]?: T[K] | null } = opts.unknownFields === 'discard' ? { ...u } : {}
		const struct: Record<keyof T, unknown> = u as any
		let errors: string[] = []
		const props = this.schema.props

		// decode fields
		for (const p in props) {
			let res
			if (isOk(props[p].type.ts.decode(undefined, opts))) {
				// optional field => accept undefined and null
				res = (struct[p] as any) === undefined ? ok(undefined)
					: (struct[p] as any) === null ? ok(null)
					: props[p].type.ts.decode(struct[p], opts)
			} else {
				// required field => accept only undefined
				res = (struct[p] as any) === undefined ? ok(undefined)
					: props[p].type.ts.decode(struct[p], opts)
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
		return ok(ret as { [K in keyof T]: T[K] })
	}
}

export function schemaPatch<T extends { [K: string]: unknown }, KEYS extends keyof T, GK extends KEYS>(schema: Schema<T, KEYS, GK>): SchemaPatchType<T, KEYS, GK> {
	return new SchemaPatchType(schema)
}

//////////////////////
// Post Schema Type //
//////////////////////
// - genKey is missing
// - other props strict checked
//
export class SchemaPostType<T extends { [K: string]: unknown }, KEYS extends keyof T, GK extends KEYS> extends Type<
	{ [K in Exclude<RequiredKeys<T>, GK>]: T[K] } & { [K in Exclude<OptionalKeys<T>, GK>]?: T[K] }
> {
	schema: Schema<T, KEYS, GK>

	constructor(schema: Schema<T, KEYS, GK>) {
		super()
		this.schema = schema
	}

	print() {
		const props = this.schema.props
		return '{ '
			+ (Object.keys(props) as (keyof T)[]).filter(name => name !== this.schema.genKey).map(name =>
				`${name}${isOk(props[name].type.ts.decode(undefined, {})) ? '?' : ''}: ${props[name].type.ts.print()}`
			).join(', ')
			+ ' }'
	}

	checkExtraFields(struct: Record<keyof T, unknown>, opts: DecoderOpts) {
		let errors: string[] = []

		if (opts.unknownFields === 'drop' || opts.unknownFields === 'discard') return []
		for (const p of Object.getOwnPropertyNames(struct)) {
			if (!this.schema.props.hasOwnProperty(p) || p === this.schema.genKey) errors.push(`${p}: unknown field`)
		}
		return errors
	}

	decode(u: unknown, opts: DecoderOpts): Result<
		{ [K in Exclude<RequiredKeys<T>, GK>]: T[K] }
		& { [K in Exclude<OptionalKeys<T>, GK>]?: T[K] }
	> {
		if (typeof u !== 'object' || u === null) {
			return err('expected object')
		}

		const ret: { [K in keyof T]?: T[K] } = opts.unknownFields === 'discard' ? { ...u } : {}
		const struct: Record<keyof T, unknown> = u as any
		let errors: string[] = []
		const props = this.schema.props

		// decode fields
		for (const p in props) {
			if (p as any !== this.schema.genKey) {
				const res = props[p].type.ts.decode(struct[p], opts)
				if (isOk(res)) {
					ret[p] = res.ok
				} else {
					errors.push(`${p}: ${res.err}`)
				}
			}
		}
		// check extra fields
		errors.splice(-1, 0, ...this.checkExtraFields(struct, opts))
		if (errors.length) return err(errors.join('\n'))
		return ok(ret as { [K in keyof T]: T[K] })
	}
}

export function schemaPost<T extends { [K: string]: unknown }, KEYS extends keyof T, GK extends KEYS>(schema: Schema<T, KEYS, GK>): SchemaPostType<T, KEYS, GK> {
	return new SchemaPostType(schema)
}

////////////////////////////////////////
// Edit Post (partial without genKey) //
////////////////////////////////////////
// - genKey is missing
// - required fields: value | undefined
// - optional fields: value | undefined
//
export class SchemaPostPartialType<T extends { [K: string]: unknown }, KEYS extends keyof T, GK extends KEYS> extends Type<
	{ [K in Exclude<keyof T, GK>]?: T[K] | undefined }
> {
	schema: Schema<T, KEYS, GK>

	constructor(schema: Schema<T, KEYS, GK>) {
		super()
		this.schema = schema
	}

	print() {
		const props = this.schema.props
		return '{ '
			+ (Object.keys(props) as (keyof T)[]).filter(name => name !== this.schema.genKey).map(name =>
				`${name}?: ${props[name].type.ts.print()}`
			).join(', ')
			+ ' }'
	}

	checkExtraFields(struct: Record<keyof T, unknown>, opts: DecoderOpts) {
		let errors: string[] = []

		if (opts.unknownFields === 'drop' || opts.unknownFields === 'discard') return []
		for (const p of Object.getOwnPropertyNames(struct)) {
			if (!this.schema.props.hasOwnProperty(p) || p === this.schema.genKey) errors.push(`${p}: unknown field`)
		}
		return errors
	}

	decode(u: unknown, opts: DecoderOpts): Result<{ [K in Exclude<keyof T, GK>]?: T[K] | undefined }> {
		if (typeof u !== 'object' || u === null) {
			return err('expected object')
		}

		const ret: { [K in keyof T]?: T[K] } = opts.unknownFields === 'discard' ? { ...u } : {}
		const struct: Record<keyof T, unknown> = u as any
		let errors: string[] = []
		const props = this.schema.props

		// decode fields
		for (const p in props) {
			if (p as any !== this.schema.genKey) {
				const res = (struct[p] as any) === undefined ? ok(undefined) : props[p].type.ts.decode(struct[p], opts)
				if (isOk(res)) {
					ret[p] = res.ok
				} else {
					errors.push(`${p}: ${res.err}`)
				}
			}
		}
		// check extra fields
		errors.splice(-1, 0, ...this.checkExtraFields(struct, opts))
		if (errors.length) return err(errors.join('\n'))
		return ok(ret as { [K in keyof T]?: T[K] })
	}
}

export function schemaPostPartial<T extends { [K: string]: unknown }, KEYS extends keyof T, GK extends KEYS>(schema: Schema<T, KEYS, GK>): SchemaPostPartialType<T, KEYS, GK> {
	return new SchemaPostPartialType(schema)
}

//////////
// Keys //
//////////
// - keys: required
// - other fields: missing
//
export class SchemaKeysType<T extends { [K: string]: unknown }, KEYS extends keyof T, GK extends KEYS> extends Type<
	{ [K in KEYS]: T[K] }
> {
	schema: Schema<T, KEYS, GK>

	constructor(schema: Schema<T, KEYS, GK>) {
		super()
		this.schema = schema
	}

	print() {
		const props = this.schema.props
		return '{ '
			+ this.schema.keys.map(name =>
				`${name}: ${props[name].type.ts.print()}`
			).join(', ')
			+ ' }'
	}

	checkExtraFields(struct: Record<KEYS, unknown>, opts: DecoderOpts) {
		let errors: string[] = []

		if (opts.unknownFields === 'drop' || opts.unknownFields === 'discard') return []
		for (const p of Object.getOwnPropertyNames(struct)) {
			if (!(this.schema.keys as string[]).includes(p)) errors.push(`${p}: unknown field`)
		}
		return errors
	}

	decode(u: unknown, opts: DecoderOpts): Result<{ [K in KEYS]: T[K] }> {
		if (typeof u !== 'object' || u === null) {
			return err('expected object')
		}

		const ret: { [K in KEYS]?: T[K] } = opts.unknownFields === 'discard' ? { ...u } : {}
		const struct: Record<KEYS, unknown> = u as any
		let errors: string[] = []
		const props = this.schema.props

		// decode fields
		for (const p of this.schema.keys) {
			const res = props[p].type.ts.decode(struct[p], opts)
			if (isOk(res)) {
				ret[p] = res.ok
			} else {
				errors.push(`${p}: ${res.err}`)
			}
		}
		// check extra fields
		errors.splice(-1, 0, ...this.checkExtraFields(struct, opts))
		if (errors.length) return err(errors.join('\n'))
		return ok(ret as { [K in KEYS]: T[K] })
	}
}

export function schemaKeys<T extends { [K: string]: unknown }, KEYS extends keyof T, GK extends KEYS>(schema: Schema<T, KEYS, GK>): SchemaKeysType<T, KEYS, GK> {
	return new SchemaKeysType(schema)
}

// vim: ts=4
