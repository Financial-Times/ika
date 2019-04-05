const yargs = require("yargs")
const nock = require('nock');
const yargsModule = require("../../../src/commands/pulls/close")

// Don't let Octokit make network requests
nock.disableNetConnect();

jest.mock('fs', () => ({
	existsSync: jest.fn().mockReturnValue(true),
	readFileSync: jest.fn().mockReturnValue(true),
}))
jest.spyOn(global.console, "warn");
afterEach(() => {
	jest.clearAllMocks();
});

describe("Yargs", () => {
	test("`pulls close` command module exports an object that can be used by yargs", () => {
		expect(yargsModule).toEqual(
			expect.objectContaining({
				command: expect.stringMatching("close"),
				desc: expect.any(String),
				builder: expect.any(Function),
				handler: expect.any(Function),
			})
		)
	})

	test("yargs can load the `pulls close` command without any errors or warnings", () => {
		expect(() => {
			yargs.command(
				yargsModule.command,
				yargsModule.desc,
				yargsModule.builder,
				yargsModule.handler
			).argv
		}).not.toThrow()
		expect(console.warn).not.toBeCalled()
	})

	const requiredOptions = {
		owner: "test",
		repo: "test",
		number: 1,
	}
	for (let option of Object.keys(requiredOptions)) {
		test(`Running the command handler without '${option}' throws an error`, async () => {
			expect.assertions(1)
			try {
				const testOptions = Object.assign({}, requiredOptions)
				delete testOptions[option]
				await yargsModule.handler(testOptions)
			} catch (error) {
				expect(error).toBeInstanceOf(Error)
			}
		})
	}
})

describe("Octokit", () => {

	// If this endpoint is not called, nock.isDone() will be false.
	nock('https://api.github.com')
		.persist()
		.patch('/repos/test/test/pulls/1')
		.reply(200, {})

	test("running the command handler triggers a network request of the GitHub API", async () => {
		await yargsModule.handler({
			token: "test",
			owner: "test",
			repo: "test",
			number: 1,
		})
		expect(nock.isDone()).toBe(true)
	})
})