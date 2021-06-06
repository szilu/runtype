import { Result, ok, err, isOk, isErr, RequiredKeys, OptionalKeys } from './utils'
import { Type, DecoderOpts } from './type'
import * as t from './index'
import { Validator, validate } from './validator'

export interface FieldType<T> {
	ts: t.Type<T>
	valid?: Validator<Exclude<T, undefined>>
}

export interface FieldDesc<T> {
	type: FieldType<T>
	valid?: Validator<Exclude<T, undefined>>
	desc?: string
	//schema?: Schema<any, any, any>
	schema?: undefined
}

interface SubSchema<T> /*extends FieldDesc<T>*/ {
	type?: undefined
	desc?: string
	multiple?: boolean
	optional?: boolean
	schema: Schema<any, any, any>
}

function decodeSubSchema(u: unknown, optional: boolean = false, multiple: boolean = false) {
	if (optional && u === undefined) return ok(undefined)
	if (multiple) {
		return t.array(t.unknownObject).decode(u, {})
	} else {
		return t.unknownObject.decode(u, {})
	}
}

export interface Schema<T, KEYS extends keyof T, GK extends KEYS> {
	genKey?: GK
	keys: KEYS[]
	props: { [P in keyof T]: FieldDesc<T[P]> | SubSchema<T[P]> }
}

export function schema<SD extends { [P: string]: FieldDesc<any> | SubSchema<any> }, KEYS extends keyof SD, GK extends KEYS>(
	props: SD,
	keys: KEYS[] = [],
	genKey?: GK
): Schema<{ [P in keyof SD]: SD[P] extends SubSchema<any>
		? (SD[P]['multiple'] extends true ? {}[] : {}) | (SD[P]['optional'] extends true ? undefined : never)
		: SD[P] extends FieldDesc<infer T> ? T : never }, KEYS, GK> {
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
	? { [K in Exclude<keyof T, KEYS>]?: T[K] | undefined | (undefined extends T[K] ? null : never) }
	//? { [K in RequiredKeys<T>]?: T[K] | undefined } & { [K in OptionalKeys<T>]?: T[K] | null | undefined }
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
export class SchemaStrictType<T, KEYS extends keyof T, GK extends KEYS> extends Type<
	StrictTypeOf<Schema<T, KEYS, GK>>
> {
	schema: Schema<T, KEYS, GK>

	constructor(schema: Schema<T, KEYS, GK>) {
		super()
		this.schema = schema
	}

	print(): string {
		const props = this.schema.props
		return '{ '
			+ (Object.keys(props) as (keyof T)[]).map(name => {
				const prop = props[name]
				return prop.type
					? `${name}${isOk(prop.type.ts.decode(undefined, {})) ? '?' : ''}: ${prop.type.ts.print()}`
					: `${name}${prop.optional ? '?' : ''}: ${schemaStrict(prop.schema).print()}${prop.multiple ? '[]' : ''}`
			}).join(', ')
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

	decode(u: unknown, opts: DecoderOpts): Result<StrictTypeOf<Schema<T, KEYS, GK>>> {
		if (typeof u !== 'object' || u === null) {
			return err('expected object')
		}

		const ret: { [K in keyof T]?: T[K] } = opts.unknownFields === 'discard' ? { ...u } : {}
		const struct: Record<keyof T, unknown> = u as any
		let errors: string[] = []
		const props = this.schema.props

		// decode fields
		for (const p in props) {
			const prop = props[p]
			if (prop.type) {
				const res = prop.type.ts.decode(struct[p], opts)
				if (isOk(res)) {
					if (res.ok !== undefined) ret[p] = res.ok
				} else {
					errors.push(`${p}: ${res.err}`)
				}
			} else {
				const res = decodeSubSchema(struct[p], prop.optional, prop.multiple)
				if (isOk(res)) {
					if (res.ok !== undefined) ret[p] = res.ok as any
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

export function schemaStrict<T, KEYS extends keyof T, GK extends KEYS>(schema: Schema<T, KEYS, GK>): SchemaStrictType<T, KEYS, GK> {
	return new SchemaStrictType(schema)
}

/*
export function schemaStrict<S extends Schema<any, any, any>, KEYS extends keyof S['props'], GK extends KEYS> (
	schema: S
): S extends Schema<infer T, infer KEYS, infer GK> ? SchemaStrictType<T, KEYS, GK> : never {
	return new SchemaStrictType(schema) as any
}
*/

/////////////////////////
// Partial Schema Type //
/////////////////////////
// - keys:			value | undefined
// - required fields: value | undefined
// - optional fields: value | undefined
//
export class SchemaPartialType<T, KEYS extends keyof T, GK extends KEYS> extends Type<PartialTypeOf<Schema<T, KEYS, GK>>> {
	schema: Schema<T, KEYS, GK>

	constructor(schema: Schema<T, KEYS, GK>) {
		super()
		this.schema = schema
	}

	print() {
		const props = this.schema.props
		return '{ '
			+ (Object.keys(props) as (keyof T)[]).map(name => {
				const prop = props[name]
				return prop.type
					? `${name}?: ${prop.type.ts.print()}`
					: `${name}?: ${schemaStrict(prop.schema).print()}${prop.multiple ? '[]' : ''}`
			}).join(', ')
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

	decode(u: unknown, opts: DecoderOpts): Result<PartialTypeOf<Schema<T, KEYS, GK>>> {
		if (typeof u !== 'object' || u === null) {
			return err('expected object')
		}

		const ret: { [K in keyof T]?: T[K] } = opts.unknownFields === 'discard' ? { ...u } : {}
		const struct: Record<keyof T, unknown> = u as any
		let errors: string[] = []
		const props = this.schema.props

		// decode fields
		for (const p in props) {
			const prop = props[p]
			if (prop.type) {
				const res = (struct[p] as any) === undefined ? ok(undefined) : prop.type.ts.decode(struct[p], opts)
				if (isOk(res)) {
					ret[p] = res.ok
				} else {
					errors.push(`${p}: ${res.err}`)
				}
			} else {
				const res = (struct[p] as any) === undefined ? ok(undefined) : decodeSubSchema(struct[p], prop.optional, prop.multiple)
				if (isOk(res)) {
					if (res.ok !== undefined) ret[p] = res.ok as any
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

export function schemaPartial<T, KEYS extends keyof T, GK extends KEYS>(schema: Schema<T, KEYS, GK>): SchemaPartialType<T, KEYS, GK> {
	return new SchemaPartialType(schema)
}

///////////////////////
// Patch Schema Type //
///////////////////////
// - keys:			required
// - required fields: value | undefined
// - optional fields: value | null | undefined
//
export class SchemaPatchType<T, KEYS extends keyof T, GK extends KEYS> extends Type<PatchTypeOf<Schema<T, KEYS, GK>>> {
	schema: Schema<T, KEYS, GK>

	constructor(schema: Schema<T, KEYS, GK>) {
		super()
		this.schema = schema
	}

	print() {
		const props = this.schema.props
		return '{ '
			+ (Object.keys(props) as (keyof T)[]).map(name => {
				const prop = props[name]
				return prop.type
					? `${name}?: ${prop.type.ts.print()}${isOk(prop.type.ts.decode(undefined, {})) ? ' | null' : ''}`
					: `${name}?: ${schemaStrict(prop.schema).print()}${prop.multiple ? '[]' : ''}`
			}).join(', ')
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

	decode(u: unknown, opts: DecoderOpts): Result<PatchTypeOf<Schema<T, KEYS, GK>>> {
		if (typeof u !== 'object' || u === null) {
			return err('expected object')
		}

		const ret: { [K in keyof T]?: T[K] | null } = opts.unknownFields === 'discard' ? { ...u } : {}
		const struct: Record<keyof T, unknown> = u as any
		let errors: string[] = []
		const props = this.schema.props

		// decode fields
		for (const p in props) {
			const prop = props[p]
			if (prop.type) {
				let res
				if (isOk(prop.type.ts.decode(undefined, opts))) {
					// optional field => accept undefined and null
					res = (struct[p] as any) === undefined ? ok(undefined)
						: (struct[p] as any) === null ? ok(null)
						: prop.type.ts.decode(struct[p], opts)
				} else {
					// required field => accept only undefined
					res = (struct[p] as any) === undefined ? ok(undefined)
						: prop.type.ts.decode(struct[p], opts)
				}
				if (isOk(res)) {
					ret[p] = res.ok
				} else {
					errors.push(`${p}: ${res.err}`)
				}
			} else {
				const res = (struct[p] as any) === undefined ? ok(undefined) : decodeSubSchema(struct[p], prop.optional, prop.multiple)
				if (isOk(res)) {
					if (res.ok !== undefined) ret[p] = res.ok as any
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

export function schemaPatch<T, KEYS extends keyof T, GK extends KEYS>(schema: Schema<T, KEYS, GK>): SchemaPatchType<T, KEYS, GK> {
	return new SchemaPatchType(schema)
}

//////////////////////
// Post Schema Type //
//////////////////////
// - genKey is missing
// - other props strict checked
//
export class SchemaPostType<T, KEYS extends keyof T, GK extends KEYS> extends Type<PostTypeOf<Schema<T, KEYS, GK>>> {
	schema: Schema<T, KEYS, GK>

	constructor(schema: Schema<T, KEYS, GK>) {
		super()
		this.schema = schema
	}

	print() {
		const props = this.schema.props
		return '{ '
			+ (Object.keys(props) as (keyof T)[]).filter(name => name !== this.schema.genKey).map(name => {
				const prop = props[name]
				return prop.type
					? `${name}${isOk(prop.type.ts.decode(undefined, {})) ? '?' : ''}: ${prop.type.ts.print()}`
					: `${name}${prop.optional ? '?' : ''}: ${schemaStrict(prop.schema).print()}${prop.multiple ? '[]' : ''}`
			}).join(', ')
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

	decode(u: unknown, opts: DecoderOpts): Result<PostTypeOf<Schema<T, KEYS, GK>>> {
		if (typeof u !== 'object' || u === null) {
			return err('expected object')
		}

		const ret: { [K in keyof T]?: T[K] } = opts.unknownFields === 'discard' ? { ...u } : {}
		const struct: Record<keyof T, unknown> = u as any
		let errors: string[] = []
		const props = this.schema.props

		// decode fields
		for (const p in props) {
			const prop = props[p]
			if (prop.type) {
				if (p as any !== this.schema.genKey) {
					const res = prop.type.ts.decode(struct[p], opts)
					if (isOk(res)) {
						ret[p] = res.ok
					} else {
						errors.push(`${p}: ${res.err}`)
					}
				}
			} else {
				const res = decodeSubSchema(struct[p], prop.optional, prop.multiple)
				if (isOk(res)) {
					if (res.ok !== undefined) ret[p] = res.ok as any
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

export function schemaPost<T, KEYS extends keyof T, GK extends KEYS>(schema: Schema<T, KEYS, GK>): SchemaPostType<T, KEYS, GK> {
	return new SchemaPostType(schema)
}

////////////////////////////////////////
// Edit Post (partial without genKey) //
////////////////////////////////////////
// - genKey is missing
// - required fields: value | undefined
// - optional fields: value | undefined
//
export class SchemaPostPartialType<T, KEYS extends keyof T, GK extends KEYS> extends Type<PostPartialTypeOf<Schema<T, KEYS, GK>>> {
	schema: Schema<T, KEYS, GK>

	constructor(schema: Schema<T, KEYS, GK>) {
		super()
		this.schema = schema
	}

	print() {
		const props = this.schema.props
		return '{ '
			+ (Object.keys(props) as (keyof T)[]).filter(name => name !== this.schema.genKey).map(name => {
				const prop = props[name]
				return prop.type
					? `${name}?: ${prop.type.ts.print()}`
					: `${name}?: ${schemaStrict(prop.schema).print()}${prop.multiple ? '[]' : ''}`
			}).join(', ')
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

	decode(u: unknown, opts: DecoderOpts): Result<PostPartialTypeOf<Schema<T, KEYS, GK>>> {
		if (typeof u !== 'object' || u === null) {
			return err('expected object')
		}

		const ret: { [K in keyof T]?: T[K] } = opts.unknownFields === 'discard' ? { ...u } : {}
		const struct: Record<keyof T, unknown> = u as any
		let errors: string[] = []
		const props = this.schema.props

		// decode fields
		for (const p in props) {
			const prop = props[p]
			if (prop.type) {
				if (p as any !== this.schema.genKey) {
					const res = (struct[p] as any) === undefined ? ok(undefined) : prop.type.ts.decode(struct[p], opts)
					if (isOk(res)) {
						ret[p] = res.ok
					} else {
						errors.push(`${p}: ${res.err}`)
					}
				}
			} else {
				const res = (struct[p] as any) === undefined ? ok(undefined) : decodeSubSchema(struct[p], prop.optional, prop.multiple)
				if (isOk(res)) {
					if (res.ok !== undefined) ret[p] = res.ok as any
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

export function schemaPostPartial<T, KEYS extends keyof T, GK extends KEYS>(schema: Schema<T, KEYS, GK>): SchemaPostPartialType<T, KEYS, GK> {
	return new SchemaPostPartialType(schema)
}

//////////
// Keys //
//////////
// - keys: required
// - other fields: missing
//
export class SchemaKeysType<T, KEYS extends keyof T, GK extends KEYS> extends Type<KeysTypeOf<Schema<T, KEYS, GK>>> {
	schema: Schema<T, KEYS, GK>

	constructor(schema: Schema<T, KEYS, GK>) {
		super()
		this.schema = schema
	}

	print() {
		const props = this.schema.props
		return '{ '
			+ this.schema.keys.map(name => {
				const prop = props[name]
				return prop.type
					? `${name}: ${prop.type.ts.print()}`
					: ''
			}).join(', ')
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

	decode(u: unknown, opts: DecoderOpts): Result<KeysTypeOf<Schema<T, KEYS, GK>>> {
		if (typeof u !== 'object' || u === null) {
			return err('expected object')
		}

		const ret: { [K in KEYS]?: T[K] } = opts.unknownFields === 'discard' ? { ...u } : {}
		const struct: Record<KEYS, unknown> = u as any
		let errors: string[] = []
		const props = this.schema.props

		// decode fields
		for (const p of this.schema.keys) {
			const prop = props[p]
			if (prop.type) {
				const res = prop.type.ts.decode(struct[p], opts)
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
		return ok(ret as { [K in KEYS]: T[K] })
	}
}

export function schemaKeys<T, KEYS extends keyof T, GK extends KEYS>(schema: Schema<T, KEYS, GK>): SchemaKeysType<T, KEYS, GK> {
	return new SchemaKeysType(schema)
}

////////////////
// Validation //
////////////////
export async function validateSchema<T, KEYS extends keyof T, GK extends KEYS>(
	schema: Schema<T, KEYS, GK>,
	tp: 'Strict' | 'Partial' | 'Patch' | 'Post' | 'PostPartial',
	state: Partial<T>
): Promise<[keyof T, string][] | null> {
	let errors: [keyof T, string][] = []

	for (const name in schema.props) {
		const prop = schema.props[name]
		const v = state[name]
		let res: Result<any> = ok(undefined)

		if (tp === 'Strict'
		   || (tp === 'Partial' && v !== undefined)
		   || (tp === 'Patch' && v != null)
		   || (tp === 'Post')
		   || (tp === 'PostPartial' && v !== undefined)
	   ) {
			res = prop.type
				? prop.type.ts.decode(v, {})
				: decodeSubSchema(v, prop.optional, prop.multiple)
			if (prop.type && prop.type.valid) res = await validate(state[name], prop.type.ts, prop.type.valid)
			if (prop.type && isOk(res) && prop.valid) res = await validate(state[name], prop.type.ts, prop.valid)
		}

		if (isErr(res)) errors.push([name, res.err])
	}
	return errors.length ? errors : null
}

//////////////
// Describe //
//////////////
type SchemaDescriptionTypeOpts<S extends Schema<any, any, any>> = any

export function describeSchema<S extends Schema<any, any, any>>(schema: S, typeDesc: SchemaDescriptionTypeOpts<S> = {}): any {
	return (Object.keys(schema.props) as (keyof S)[]).map(name => {
		const prop = schema.props[name]
		//const schema: Schema<any, any, any> = (prop as any).schema
		if (prop.schema) {
			return {
				name,
				schema: describeSchema(prop.schema, typeDesc[name]?.schema || {})
			}
		} else {
			return {
				name,
				type: prop.type.ts.print(),
				desc: prop.desc || ''
			}
		}
	})
}

// vim: ts=4
