import { Result, ok, err, isOk } from './utils'
import { Type, DecoderOpts, DecoderError, decoderError } from './type'

// TaggedUnion //
/////////////////
class TaggedUnionType<A, T extends keyof A> extends Type<A[keyof A]> {
	tag: string
	//members: { [K in keyof A]: Type<A[K] & Record<T, K>> }
	members: { [K in keyof A]: Type<A[K]> }

	//constructor(tag: T, members: { [K in keyof A]: Type<A[K] & Record<T, K>> }) {
	constructor(tag: string, members: { [K in keyof A]: Type<A[K]> }) {
		super()
		this.tag = tag
		this.members = members
	}

	print() {
		return (Object.values(this.members) as Type<any>[]).map(member => member.print()).join(' | ')
	}

	decode(u: unknown, opts: DecoderOpts): Result<A[keyof A], DecoderError> {
		let errors: string[] = []

		if (typeof u !== 'object' || u === null) {
			return decoderError([], 'expected object')
		}

		const o: { [K in string]: unknown } = u as any

		if (!o[this.tag]) return decoderError([], `missing tag ('${this.tag}')')`)

		const member: any = this.members[o[this.tag] as keyof A]
		if (!member) return decoderError([], `unknown tag (${this.tag} = '${o[this.tag]}')`)

		return member.decode(u, opts)
		/*
		const res = member.decode(u, opts)
		if (isOk(res)) {
			return ok(u as any)
		}
		return res
		*/
	}
}

export function taggedUnion<A, T extends string>(tag: T, members: { [K in keyof A]: Type<A[K] & Record<T, K>> }): Type<A[keyof A]> {
//export function taggedUnion<A, T extends keyof A>(tag: string, members: { [K in keyof A]: Type<A[K]> }): Type<A[keyof A]> {
	return new TaggedUnionType(tag, members)
}

// vim: ts=4
