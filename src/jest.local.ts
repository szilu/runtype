import * as t from './index.js'

declare global {
	namespace jest {
		interface Matchers<R> {
			toBeErr(pattern?: string): R
		}
	}
}

expect.extend({
	toBeErr(received: t.Result<unknown, t.RTError>, pattern?: string) {
		if (!t.isErr(received))
			return {
				pass: false,
				message: () => `Expected: Err\nReceived: ${JSON.stringify(received)}`
			}
		if (pattern != null && !received.err.some((e) => e.error.includes(pattern)))
			return {
				pass: false,
				message: () =>
					`Expected Err matching ${JSON.stringify(pattern)}\nReceived: ${JSON.stringify(received.err)}`
			}
		return { pass: true, message: () => '' }
	}
})

// vim: ts=4
