import { StructType } from './struct.js'
import { copyValidators, type DecoderOpts, type RTError, Type } from './type.js'
import { err, isOk, type Result } from './utils.js'

// Intersection //
//////////////////
class IntersectionType<T1, T2> extends Type<T1 & T2> {
	type1: Type<T1>
	type2: Type<T2>

	constructor(type1: Type<T1>, type2: Type<T2>) {
		super()
		this.type1 = type1
		this.type2 = type2
	}

	print() {
		return this.type1.print() + ' & ' + this.type2.print()
	}

	decode(u: unknown, opts: DecoderOpts): Result<T1 & T2, RTError> {
		const errors: RTError = []

		const res1 = this.type1.decode(u, opts)
		if (!isOk(res1)) errors.push(...res1.err)

		const res2 = this.type2.decode(u, opts)
		if (!isOk(res2)) errors.push(...res2.err)

		if (errors.length) return err(errors)
		return res1 as Result<T1 & T2, RTError>
	}

	async validate(v: T1 & T2, opts: DecoderOpts) {
		const errors: RTError = []

		const res1 = await this.type1.validate(v, opts)
		if (!isOk(res1)) errors.push(...res1.err)

		const res2 = await this.type2.validate(v, opts)
		if (!isOk(res2)) errors.push(...res2.err)

		if (errors.length) return err(errors)
		return this.validateBase(v, opts)
	}

	validateSync(v: T1 & T2, opts: DecoderOpts): Result<T1 & T2, RTError> {
		this.checkSync()
		const errors: RTError = []

		const res1 = this.type1.validateSync(v, opts)
		if (!isOk(res1)) errors.push(...res1.err)

		const res2 = this.type2.validateSync(v, opts)
		if (!isOk(res2)) errors.push(...res2.err)

		if (errors.length) return err(errors)
		return this.validateBaseSync(v, opts)
	}

	deepMap(fn: (t: Type<unknown>) => Type<unknown>): Type<unknown> {
		const t1 = fn(this.type1 as unknown as Type<unknown>)
		const t2 = fn(this.type2 as unknown as Type<unknown>)
		return copyValidators(this, intersection(t1, t2)) as unknown as Type<unknown>
	}
}

class IntersectionStructType<
	T1 extends { [K: string]: unknown },
	T2 extends { [K: string]: unknown }
> extends StructType<T1 & T2> {
	struct1: StructType<T1>
	struct2: StructType<T2>

	constructor(struct1: StructType<T1>, struct2: StructType<T2>) {
		const props: Record<string, Type<unknown>> = {}
		const p1 = struct1.props as Record<string, Type<unknown>>
		const p2 = struct2.props as Record<string, Type<unknown>>

		for (const k of Object.keys(p1)) {
			const t1 = p1[k]
			const t2 = Object.hasOwn(p2, k) ? p2[k] : undefined
			props[k] = t2 && t2 !== t1 ? intersection(t1, t2) : t1
		}
		for (const k of Object.keys(p2)) {
			if (!Object.hasOwn(p1, k)) props[k] = p2[k]
		}
		super(props as { [K in keyof (T1 & T2)]: Type<(T1 & T2)[K]> })
		this.struct1 = struct1
		this.struct2 = struct2
		// struct1/struct2's own validators become this type's own, so copyValidators(),
		// deepPartial() and deepPatch() carry them and validateBase()/validateBaseSync() run
		// them. Left undefined when empty: `validators` is public and `[]` reads as truthy.
		const validators = [...(struct1.validators ?? []), ...(struct2.validators ?? [])]
		// biome-ignore lint/suspicious/noExplicitAny: StructType's mapped value type is not nameable here
		if (validators.length) this.validators = validators as any
		const asyncValidators = [
			...(struct1.asyncValidators ?? []),
			...(struct2.asyncValidators ?? [])
		]
		// biome-ignore lint/suspicious/noExplicitAny: StructType's mapped value type is not nameable here
		if (asyncValidators.length) this.asyncValidators = asyncValidators as any
	}

	print() {
		return this.struct1.print() + ' & ' + this.struct2.print()
	}
}

export function intersection<T1, T2>(type1: Type<T1>, type2: Type<T2>): Type<T1 & T2>
export function intersection<
	T1 extends { [K: string]: unknown },
	T2 extends { [K: string]: unknown }
>(type1: StructType<T1>, type2: StructType<T2>): StructType<T1 & T2>
export function intersection<T1, T2>(type1: Type<T1>, type2: Type<T2>): Type<T1 & T2> {
	if (type1 instanceof StructType && type2 instanceof StructType) {
		return new IntersectionStructType(type1, type2) as unknown as Type<T1 & T2>
	} else {
		return new IntersectionType(type1, type2)
	}
}

// vim: ts=4
