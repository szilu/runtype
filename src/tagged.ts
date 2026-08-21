import { copyValidators, type DecoderOpts, error, type RTError, Type } from './type.js'
import { union } from './union.js'
import { isErr, type Result } from './utils.js'

// TaggedUnion //
/////////////////
export class TaggedUnionType<A, T extends string> extends Type<A[keyof A]> {
	tag: T
	members: { [K in keyof A]: Type<A[K] & Record<T, K>> }

	constructor(tag: T, members: { [K in keyof A]: Type<A[K] & Record<T, K>> }) {
		super()
		this.tag = tag
		this.members = members
	}

	print() {
		return (Object.values(this.members) as Type<A[keyof A]>[])
			.map((member) => member.print())
			.join(' | ')
	}

	// Members are keyed by object property, so only string/number tags can name one.
	// Anything else (an object, a symbol) would throw on key coercion - decode() is a
	// trust boundary and must always return a Result.
	private resolveMember(tag: unknown): Type<A[keyof A]> | undefined {
		if (typeof tag !== 'string' && typeof tag !== 'number') return undefined
		return Object.hasOwn(this.members, tag)
			? (this.members[tag as keyof A] as unknown as Type<A[keyof A]>)
			: undefined
	}

	private unknownTagError(tag: unknown): string {
		return typeof tag === 'string' || typeof tag === 'number'
			? `unknown tag (${this.tag} = '${tag}')`
			: `invalid tag (${this.tag})`
	}

	decode(u: unknown, opts: DecoderOpts): Result<A[keyof A], RTError> {
		if (typeof u !== 'object' || u === null || Array.isArray(u)) {
			return error('expected object')
		}

		const o: { [K in T]: unknown } = u as { [K in T]: unknown }
		const tag = o[this.tag]
		if (tag === undefined) return error(`missing tag ('${this.tag}')`)

		const member = this.resolveMember(tag)
		if (!member) return error(this.unknownTagError(tag))

		return member.decode(u, opts)
	}

	async validate(v: A[keyof A], opts: DecoderOpts): Promise<Result<A[keyof A], RTError>> {
		const tag = (v as { [K in T]?: unknown } | null | undefined)?.[this.tag]
		const member = this.resolveMember(tag)
		if (!member) return error(this.unknownTagError(tag))
		const res = await member.validate(v, opts)
		return isErr(res) ? res : this.validateBase(v, opts)
	}

	validateSync(v: A[keyof A], opts: DecoderOpts): Result<A[keyof A], RTError> {
		this.checkSync()
		const tag = (v as { [K in T]?: unknown } | null | undefined)?.[this.tag]
		const member = this.resolveMember(tag)
		if (!member) return error(this.unknownTagError(tag))
		const res = member.validateSync(v, opts)
		return isErr(res) ? res : this.validateBaseSync(v, opts)
	}

	// deepPartial()/deepPatch() make the discriminant optional, but dispatch needs the tag
	// present - so the rewrite is a plain union(). Members keep their literal tag prop, so a
	// supplied tag still selects correctly; only a tag-less object matches the first member.
	deepMap(fn: (t: Type<unknown>) => Type<unknown>): Type<unknown> {
		return copyValidators(
			this,
			union(...(Object.values(this.members) as Type<unknown>[]).map(fn))
		)
	}
}

export function taggedUnion<T extends string>(tag: T) {
	return function <A>(members: { [K in keyof A]: Type<A[K] & Record<T, K>> }) {
		return new TaggedUnionType<A, T>(tag, members)
	}
}

// vim: ts=4
