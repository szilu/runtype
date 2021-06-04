import { Result, ok, err, isOk, isErr, RequiredKeys, OptionalKeys } from './utils'
import { Type, DecoderOpts } from './type'

//////////////////////
// Type definitions //
//////////////////////
export type ValidatorFunc<T = unknown> = (value: T) => Result | Promise<Result>

export interface ValidatorIF<T = unknown> {
	validate: ValidatorFunc<T>
	compose(): ValidatorFunc<T>
}

export type Validator<T> = ValidatorIF<T> | ValidatorFunc<T>

/////////////////////
// Validator class //
/////////////////////
export class ValidatorBase<T = unknown> {
	parent?: ValidatorBase<T>
	validF: ValidatorFunc<T> = (value: T) => ok(undefined)

	constructor(validF: ValidatorFunc<T>, parent?: ValidatorBase<T>) {
		this.parent = parent
		this.validF = validF
	}

	compose(): ValidatorFunc<T> {
		const validateF = this.validate.bind(this)
		if (this.parent) {
			const parentF = this.parent.compose()
			return function validate(v: T) {
				return parentF(v) && validateF(v)
			}
		} else {
			return function validate(v: T) {
				return validateF(v)
			}
		}
	}

	validate(v: T): Result | Promise<Result> {
		return (!this.parent || this.parent.validate(v)) && this.validF(v)
	}

	/*
	validator(v: T, next?: ValidatorFunc<T>) {
		return (!next || next(v)) && this.validF(v)
	}
	*/

	in(...list: T[]) {
		return Object.create(Object.getPrototypeOf(this), { parent: { value: this }, validate: { value: (v: T) => list.indexOf(v) >= 0 ? ok(undefined) : err(`must be one of [${list.map(l => JSON.stringify(l)).join(',')}]`) } })
	}
}

export class NumberValidator extends ValidatorBase<number> {
	integer() {
		return new NumberValidator((v: number) => v === Math.round(v) ? ok(undefined) : err('must be integer'), this)
	}

	positive() {
		return new NumberValidator((v: number) => v >= 0 ? ok(undefined) : err('must be positive'), this)
	}

	negative() {
		return new NumberValidator((v: number) => v <= 0 ? ok(undefined) : err('must be negative'), this)
	}

	min(min: number) {
		return new NumberValidator((v: number) => v >= min ? ok(undefined) : err(`must be at least ${min}`), this)
	}

	max(max: number) {
		return new NumberValidator((v: number) => v <= max ? ok(undefined) : err(`must be at most ${max}`), this)
	}
}

export class StringValidator extends ValidatorBase<string> {
	length(len: number) {
		return new StringValidator((v: string) => v.length === len ? ok(undefined) : err(`length must be ${len}`), this)
	}

	minLength(len: number) {
		return new StringValidator((v: string) => v.length >= len ? ok(undefined) : err(`length must be at least ${len}`), this)
	}

	maxLength(len: number) {
		return new StringValidator((v: string) => v.length <= len ? ok(undefined) : err(`length must be at most ${len}`), this)
	}

	/*
	in(...list: string[]): StringValidator {
		return new StringValidator((v: string) => list.indexOf(v) >= 0 ? ok(undefined) : err(`must be one of ${list.map(l => `"${l}"`).join(',')}`), this)
	}
	*/

	matches(pattern: RegExp) {
		return new StringValidator((v: string) => pattern.test(v) ? ok(undefined) : err(`must match ${pattern}`), this)
	}

	email() {
		const pattern = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
		return new StringValidator((v: string) => pattern.test(v) ? ok(undefined) : err(`must be valid email address`), this)
	}
}

export class BooleanValidator extends ValidatorBase<boolean> {
	true() {
		return new BooleanValidator((v: boolean) => v ? ok(undefined) : err('must be true'), this)
	}

	false() {
		return new BooleanValidator((v: boolean) => !v ? ok(undefined) : err('Must be false'), this)
	}
}

export class DateValidator extends ValidatorBase<string> {
	min(min: string | Date) {
		const minD = typeof min === 'string' ? new Date(min) : min
		return new DateValidator((v: string) => Date.parse(v) >= minD.valueOf() ? ok(undefined) : err(`must be at least ${minD.toISOString()}`), this)
	}

	max(max: string | Date) {
		const maxD = typeof max === 'string' ? new Date(max) : max
		return new DateValidator((v: string) => Date.parse(v) <= maxD.valueOf() ? ok(undefined) : err(`must be at most ${maxD.toISOString()}`), this)
	}
}

// tslint:disable:strict-type-predicates
export function number() {
	return new NumberValidator((v: number) => (typeof v === 'number' && !Number.isNaN(v)) ? ok(undefined) : err('must be valid number'))
}

export function string() {
	return new StringValidator((v: string) => typeof v === 'string' ? ok(undefined) : err('must be string'))
}

export function boolean() {
	return new BooleanValidator((v: boolean) => typeof v === 'boolean' ? ok(undefined) : err('must be boolean'))
}

export function date() {
	return new DateValidator((v: string) => typeof v === 'string' && !Number.isNaN(Date.parse(v)) ? ok(undefined) : err('must be string parseable as date'))
}
// tslint:enable:strict-type-predicates

export async function validate<T>(value: unknown, type: Type<T>, validator?: Validator<Exclude<T, undefined>>, opts: DecoderOpts = {}): Promise<Result> {
	const decoded = type.decode(value, {})
	if (isOk(decoded)) {
		if (decoded.ok !== undefined && validator) {
			return typeof validator === 'function'
				? validator(decoded.ok as Exclude<T, undefined>)
				: validator.validate(decoded.ok as Exclude<T, undefined>)
		} else {
			return ok(undefined)
		}
	}
	return err('invalid type')
}

// vim: ts=4
