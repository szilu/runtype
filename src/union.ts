import { copyValidators, type DecoderOpts, type RTError, Type } from './type.js'
import { err, isOk, type Result } from './utils.js'

type ElementType<T extends ReadonlyArray<unknown>> =
	T extends ReadonlyArray<infer ElementType> ? ElementType : never

// Union members fail for unrelated reasons at the same path; without the member index the
// merged list reads as a set of contradictions.
function tagMember(i: number, errors: RTError): RTError {
	return errors.map((e) => ({ path: e.path, error: `member ${i}: ${e.error}` }))
}

// Report only the closest match - a member that failed on one field beats every member's
// full complaint list. Ties are all reported (`union(string, number)` on a boolean has no
// closest). This also lets a deepPartial()/deepPatch()-rewritten taggedUnion() report the
// tag mismatch, since the tag-matched member fails on fewer fields than the rest.
function bestErrors(candidates: { i: number; err: RTError }[]): RTError {
	if (!candidates.length) return [{ path: [], error: 'none of the union type members matched' }]
	let min = Infinity
	for (const c of candidates) if (c.err.length < min) min = c.err.length
	const out: RTError = []
	for (const c of candidates) if (c.err.length === min) out.push(...tagMember(c.i, c.err))
	return out
}

// Union //
///////////
export class UnionType<T extends ReadonlyArray<unknown>> extends Type<ElementType<T>> {
	members: { [K in keyof T]: Type<T[K]> }

	constructor(members: { [K in keyof T]: Type<T[K]> }) {
		super()
		this.members = members
	}

	print() {
		return this.members.map((member) => member.print()).join(' | ')
	}

	decode(u: unknown, opts: DecoderOpts): Result<ElementType<T>, RTError> {
		const candidates: { i: number; err: RTError }[] = []
		for (let i = 0; i < this.members.length; i++) {
			const matched = this.members[i].decode(u, opts)
			if (isOk(matched)) return matched as Result<ElementType<T>, RTError>
			candidates.push({ i, err: matched.err })
		}
		return err(bestErrors(candidates))
	}

	async validate(v: ElementType<T>, opts: DecoderOpts): Promise<Result<ElementType<T>, RTError>> {
		const candidates: { i: number; err: RTError }[] = []

		for (let i = 0; i < this.members.length; i++) {
			const m = this.members[i]
			const matched = m.decode(v, opts)
			if (!isOk(matched)) continue
			const res = await m.validate(matched.ok, opts)
			if (isOk(res)) return this.validateBase(v, opts)
			candidates.push({ i, err: res.err })
		}
		return err(bestErrors(candidates))
	}

	validateSync(v: ElementType<T>, opts: DecoderOpts): Result<ElementType<T>, RTError> {
		this.checkSync()
		const candidates: { i: number; err: RTError }[] = []

		for (let i = 0; i < this.members.length; i++) {
			const m = this.members[i]
			const matched = m.decode(v, opts)
			if (!isOk(matched)) continue
			const res = m.validateSync(matched.ok, opts)
			if (isOk(res)) return this.validateBaseSync(v, opts)
			candidates.push({ i, err: res.err })
		}
		return err(bestErrors(candidates))
	}

	deepMap(fn: (t: Type<unknown>) => Type<unknown>): Type<unknown> {
		return copyValidators(this, union(...(this.members as Type<unknown>[]).map(fn)))
	}
}

export function union<T extends ReadonlyArray<unknown>>(
	...members: { [K in keyof T]: Type<T[K]> }
): Type<ElementType<T>> {
	return new UnionType<T>(members)
}

// vim: ts=4
