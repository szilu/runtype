import * as t from './index.js'

declare global {
	namespace jest {
		interface Matchers<R> {
			toBeErr(pattern?: string): R;
		}
	}
}

expect.extend({
	toBeErr(received: t.Result<any>, pattern?: string) {
		return t.isErr(received)
			? { pass: true, message: () => '' }
			: { pass: false, message: () => `Expected: Err\nReceived: ${JSON.stringify(received)}` }
	}
})

// vim: ts=4
