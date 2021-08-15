// Result type //
/////////////////
export interface Ok<T> {
	readonly _tag: 'Ok'
	readonly ok: T
}

export interface Err<E = string> {
	readonly _tag: 'Err'
	readonly err: E
}

export type Result<T = undefined, E = string> = Ok<T> | Err<E>

export function ok<T>(t: T): Ok<T> { return { _tag: 'Ok', ok: t } }

export function err<E>(error: E): Err<E> { return { _tag: 'Err', err: error } }

export function isOk<T, E>(r: Result<T, E>): r is Ok<T> { return r._tag === 'Ok' }

export function isErr<E>(r: Result<any, E>): r is Err<E> { return r._tag === 'Err' }

// TS helpers //
////////////////
export type Narrow<T> = T extends string | number | boolean ? T : never

export type OptionalKeys<T> = { [P in keyof T]: undefined extends T[P] ? P : never }[keyof T]
export type RequiredKeys<T> = { [P in keyof T]: undefined extends T[P] ? never : P }[keyof T]

// Other helper funcs //
////////////////////////
export function isEmptyObject(obj: unknown) {
	if (typeof obj !== 'object' || obj === null) return false
	for (const k in obj) return false
	return true
}

// vim: ts=4
