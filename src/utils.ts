// Result type //
/////////////////
export interface Ok<T> {
	readonly ok: T
}

export interface Err<E = string> {
	readonly err: E
}

export type Result<T = undefined, E = string> = Ok<T> | Err<E>

export function ok<T>(t: T): Ok<T> { return { ok: t } }

export function err<E>(error: E): Err<E> { return { err: error } }

export function isOk<T, E>(r: Result<T, E>): r is Ok<T> { return 'ok' in r }

export function isErr<E>(r: Result<any, E>): r is Err<E> { return 'err' in r }

// TS helpers //
////////////////
export type Narrow<T> = T extends string | number | boolean ? T : never

export type OptionalKeys<T> = { [P in keyof T]: undefined extends T[P] ? P : never }[keyof T]
export type RequiredKeys<T> = { [P in keyof T]: undefined extends T[P] ? never : P }[keyof T]
export type RequireFields<T> =
	{ [K in RequiredKeys<T>]: T[K] }
	& { [K in OptionalKeys<T>]-?: T[K] | undefined }

// Other helper funcs //
////////////////////////
export function isEmptyObject(obj: unknown) {
	if (typeof obj !== 'object' || obj === null) return false
	for (const k in obj) return false
	return true
}

// vim: ts=4
