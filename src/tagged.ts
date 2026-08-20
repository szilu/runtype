import { type Result, isErr } from './utils.js'
import { Type, type DecoderOpts, type RTError, error } from './type.js'

// TaggedUnion //
/////////////////
class TaggedUnionType<A, T extends string> extends Type<A[keyof A]> {
	tag: T
	members: { [K in keyof A]: Type<A[K] & Record<T, K>> }

	constructor(tag: T, members: { [K in keyof A]: Type<A[K] & Record<T, K>> }) {
		super()
		this.tag = tag
		this.members = members
	}

	print() {
		return (Object.values(this.members) as Type<any>[])
			.map((member) => member.print())
			.join(' | ')
	}

	decode(u: unknown, opts: DecoderOpts): Result<A[keyof A], RTError> {
		if (typeof u !== 'object' || u === null || Array.isArray(u)) {
			return error('expected object')
		}

		const o: { [K in T]: unknown } = u as any

		if (!o[this.tag]) return error(`missing tag ('${this.tag}')`)

		const member: any = Object.prototype.hasOwnProperty.call(this.members, o[this.tag] as any)
			? this.members[o[this.tag] as keyof A]
			: undefined
		if (!member) return error(`unknown tag (${this.tag} = '${o[this.tag]}')`)

		return member.decode(u, opts)
	}

	async validate(v: A[keyof A], opts: DecoderOpts): Promise<Result<A[keyof A], RTError>> {
		const tag = (v as any)?.[this.tag]
		const member: Type<any> | undefined = Object.prototype.hasOwnProperty.call(
			this.members,
			tag
		)
			? this.members[tag as keyof A]
			: undefined
		if (!member) return error(`unknown tag (${this.tag} = '${String(tag)}')`)
		const res = await member.validate(v, opts)
		return isErr(res) ? res : this.validateBase(v, opts)
	}

	validateSync(v: A[keyof A], opts: DecoderOpts): Result<A[keyof A], RTError> {
		const tag = (v as any)?.[this.tag]
		const member: Type<any> | undefined = Object.prototype.hasOwnProperty.call(
			this.members,
			tag
		)
			? this.members[tag as keyof A]
			: undefined
		if (!member) return error(`unknown tag (${this.tag} = '${String(tag)}')`)
		const res = member.validateSync(v, opts)
		return isErr(res) ? res : this.validateBaseSync(v, opts)
	}
}

export function taggedUnion<T extends string>(tag: T) {
	return function <A>(members: { [K in keyof A]: Type<A[K] & Record<T, K>> }) {
		return new TaggedUnionType<A, T>(tag, members)
	}
}

// vim: ts=4
