// Result type //
/////////////////
export interface Ok<T> {
	readonly _tag: 'Ok'
	readonly ok: T
}

export interface Err {
	readonly _tag: 'Err'
	readonly err: string
}

export type Result<T> = Ok<T> | Err

export function ok<T>(t: T): Ok<T> { return { _tag: 'Ok', ok: t } }

export function err(error: string): Err { return { _tag: 'Err', err: error } }

export function isOk<T>(r: Result<T>): r is Ok<T> { return r._tag === 'Ok' }

export function isErr(r: Result<any>): r is Err { return r._tag === 'Err' }

// TS helpers //
////////////////
export type OptionalKeys<T> = { [P in keyof T]: undefined extends T[P] ? P : never }[keyof T]
export type RequiredKeys<T> = { [P in keyof T]: undefined extends T[P] ? never : P }[keyof T]

// vim: ts=4
