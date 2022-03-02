import { Result, ok, err, isOk, isErr } from './utils'
import { Type, DecoderOpts, RTError, error } from './type'

// TaggedUnion //
/////////////////
//class TaggedUnionType<A, T extends keyof A> extends Type<A[keyof A]> {
//class TaggedUnionType<A extends Record<T, any>, T extends string> extends Type<A[keyof A]> {
class TaggedUnionType<A, T extends string> extends Type<A[keyof A]> {
	tag: T
	//members: { [K in keyof A]: Type<A[K] & Record<T, K>> }
	//members: { [K in keyof A]: Type<A[K]> }
	members: { [K in keyof A]: Type<A[K] & Record<T, K>> }

	//constructor(tag: T, members: { [K in keyof A]: Type<A[K] & Record<T, K>> }) {
	//constructor(tag: string, members: { [K in keyof A]: Type<A[K]> }) {
	constructor(tag: T, members: { [K in keyof A]: Type<A[K] & Record<T, K>> }) {
		super()
		this.tag = tag
		this.members = members
	}

	print() {
		return (Object.values(this.members) as Type<any>[]).map(member => member.print()).join(' | ')
	}

	//decode(u: unknown, opts: DecoderOpts): Result<A[keyof A], RTError> {
	decode(u: unknown, opts: DecoderOpts): Result<A[keyof A], RTError> {
		let errors: string[] = []

		if (typeof u !== 'object' || u === null) {
			return error('expected object')
		}

		const o: { [K in T]: unknown } = u as any

		if (!o[this.tag]) return error(`missing tag ('${this.tag}')')`)

		const member: any = this.members[o[this.tag] as keyof A]
		if (!member) return error(`unknown tag (${this.tag} = '${o[this.tag]}')`)

		return member.decode(u, opts)
		/*
		const res = member.decode(u, opts)
		if (isOk(res)) {
			return ok(u as any)
		}
		return res
		*/
	}

	/*
	async validate(v: A[keyof A], opts: DecoderOpts) {
		const member: any = this.members[v[this.tag as keyof A] as keyof A]
		return member.validate(v, opts)
	}
	*/

	async validate(v: A[keyof A], opts: DecoderOpts) {
		const member: Type<any> = this.members[(v as any)[this.tag] as keyof A]
		const res = await member.validate(v, opts)
		return isErr(res) ? res : this.validateBase(v, opts)
	}
}

//export function taggedUnion<A, T extends string>(tag: T, members: { [K in keyof A]: Type<A[K] & Record<T, K>> }): Type<A[keyof A]> {
////export function taggedUnion<A, T extends keyof A>(tag: string, members: { [K in keyof A]: Type<A[K]> }): Type<A[keyof A]> {
/*
export function taggedUnion<A, T extends keyof A>(tag: T, members: { [K in keyof A]: Type<A[K] & Record<T, K>> }): Type<A[keyof A]> {
	return new TaggedUnionType(tag, members)
}
*/

//export function taggedUnion<T extends string>(tag: T): <A>(members: { [K in keyof A]: Type<A[K] & Record<T, K>> }) => Type<A[keyof A]> {
export function taggedUnion<T extends string>(tag: T) {
	return function <A>(members: { [K in keyof A]: Type<A[K] & Record<T, K>> }) {
		return new TaggedUnionType<A, T>(tag, members)
	}
}

// vim: ts=4
