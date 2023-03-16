import { Result, err, isOk } from './utils'
import { Type, DecoderOpts, RTError, decoderError } from './type'
import { StructType } from './struct'

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
		let errors: RTError = []

		const res1 = this.type1.decode(u, opts)
		if (!isOk(res1)) errors.push(...res1.err)

		const res2 = this.type2.decode(u, opts)
		if (!isOk(res2)) errors.push(...res2.err)

		if (errors.length) return err(errors)
		return res1 as Result<T1 & T2, RTError>
	}

	async validate(v: T1 & T2, opts: DecoderOpts) {
		let errors: RTError = []

		const res1 = await this.type1.validate(v, opts)
		if (!isOk(res1)) errors.push(...res1.err)

		const res2 = await this.type2.validate(v, opts)
		if (!isOk(res2)) errors.push(...res2.err)

		if (errors.length) return err(errors)
		return this.validateBase(v, opts)
	}
}

class IntersectionStructType<T1 extends { [K: string]: unknown }, T2 extends { [K: string]: unknown }> extends StructType<T1 & T2> {
	struct1: StructType<T1>
	struct2: StructType<T2>

	constructor(struct1: StructType<T1>, struct2: StructType<T2>) {
		const props: { [K in keyof (T1 & T2)]?: Type<(T1 & T2)[K]> } = {}

		for (const k in struct1.props) {
			if (struct2.props[k as any]) props[k] =
				struct1.props[k] !== struct2.props[k as any] as any ? intersection(struct1.props[k], struct2.props[k as any] as any) as any : struct1.props[k]
			else props[k] = struct1.props[k] as any
		}
		for (const k in struct2.props) {
			if (!struct1.props[k as any]) props[k] = struct2.props[k] as any
		}
		super(props as { [K in keyof (T1 & T2)]: Type<(T1 & T2)[K]> })
		this.struct1 = struct1
		this.struct2 = struct2
	}

	print() {
		return this.struct1.print() + ' & ' + this.struct2.print()
	}
}

export function intersection<T1, T2>(type1: Type<T1>, type2: Type<T2>): Type<T1 & T2> {
	if (type1 instanceof StructType && type2 instanceof StructType) {
		return new IntersectionStructType(type1, type2) as any as Type<T1 & T2>
	} else {
		return new IntersectionType(type1, type2)
	}
}

// vim: ts=4
