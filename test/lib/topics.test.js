const nock = require('nock')
const { getTopics, addTopics, removeTopics } = require('../../src/lib/topics')

// Don't let Octokit make network requests
nock.disableNetConnect()

describe('lib/topics.js', () => {
	const githubUrl = { owner: 'Test-Owner', repo: 'Test-Repo' }
	afterEach(() => {
		jest.clearAllMocks()
		nock.cleanAll()
	})

	describe('getTopics', () => {
		test('no personalAccessToken throws an error', async () => {
			expect.assertions(1)
			try {
				await getTopics({})
			} catch (error) {
				expect(error).toBeInstanceOf(Error)
			}
		})

		test('returns topics', async () => {
			nock('https://api.github.com')
				.get('/repos/Test-Owner/Test-Repo/topics')
				.reply(200, {
					names: ['customer-products', 'app'],
				})

			const topics = await getTopics({ githubUrl, token: 'someToken' })
			expect(topics).toEqual(['customer-products', 'app'])
		})

		test('returns empty topics', async () => {
			nock('https://api.github.com')
				.get('/repos/Test-Owner/Test-Repo/topics')
				.reply(200, {
					names: [],
				})

			const topics = await getTopics({ githubUrl, token: 'someToken' })
			expect(topics).toEqual([])
		})

		test('returns empty array if no topics', async () => {
			nock('https://api.github.com')
				.get('/repos/Test-Owner/Test-Repo/topics')
				.reply(200, {})

			const topics = await getTopics({ githubUrl, token: 'someToken' })
			expect(topics).toEqual([])
		})
	})

	describe('addTopics', () => {
		const testAddTopics = async ({ existingTopics, topics, topicsToReplaceWith }) => {
			nock('https://api.github.com')
				.get('/repos/Test-Owner/Test-Repo/topics')
				.reply(200, {
					names: existingTopics,
				})
			nock('https://api.github.com')
				.put('/repos/Test-Owner/Test-Repo/topics', {
					names: topicsToReplaceWith,
				})
				.reply(200)

			await addTopics({ githubUrl, token: 'someToken', topics })
		}

		test('add no topics', async () => {
			await testAddTopics({
				existingTopics: ['customer-products', 'app'],
				topics: [],
				topicsToReplaceWith: ['customer-products', 'app'],
			})
		})

		test('adds topics array', async () => {
			await testAddTopics({
				existingTopics: ['customer-products', 'app'],
				topics: ['new'],
				topicsToReplaceWith: ['customer-products', 'app', 'new'],
			})
		})

		test('does not send topics with the same name multiple times', async () => {
			await testAddTopics({
				existingTopics: ['customer-products', 'app'],
				topics: ['app'],
				topicsToReplaceWith: ['customer-products', 'app'],
			})
		})

		test('returns topics from replace request', async () => {
			const outputTopics = ['customer-products', 'app']
			nock('https://api.github.com')
				.get('/repos/Test-Owner/Test-Repo/topics')
				.reply(200, {
					names: ['customer-products'],
				})
			nock('https://api.github.com')
				.put('/repos/Test-Owner/Test-Repo/topics')
				.reply(200, {
					names: outputTopics,
				})

			const topics = await addTopics({ githubUrl, token: 'someToken', topics: 'app' })
			expect(topics).toEqual(outputTopics)
		})

		test('does not update topics if no changes are made and outputs topics', async () => {
			const outputTopics = ['customer-products', 'app']
			nock('https://api.github.com')
				.get('/repos/Test-Owner/Test-Repo/topics')
				.reply(200, {
					names: outputTopics,
				})
			// NOTE: No nock for replacing topics here

			const topics = await addTopics({ githubUrl, token: 'someToken', topics: ['app'] })
			expect(topics).toEqual(outputTopics)
		})
	})

	describe('removeTopics', () => {
		const testRemoveTopics = async ({ existingTopics, topics, topicsToReplaceWith }) => {
			nock('https://api.github.com')
				.get('/repos/Test-Owner/Test-Repo/topics')
				.reply(200, {
					names: existingTopics,
				})
			nock('https://api.github.com')
				.put('/repos/Test-Owner/Test-Repo/topics', {
					names: topicsToReplaceWith,
				})
				.reply(200)

			await removeTopics({ githubUrl, token: 'someToken', topics })
		}

		test('remove no topic', async () => {
			await testRemoveTopics({
				existingTopics: ['customer-products', 'app'],
				topics: [],
				topicsToReplaceWith: ['customer-products', 'app'],
			})
		})

		test('remove topics array', async () => {
			await testRemoveTopics({
				existingTopics: ['customer-products', 'app', 'new'],
				topics: ['new', 'app'],
				topicsToReplaceWith: ['customer-products'],
			})
		})

		test('does nothing when removing non existent topic', async () => {
			await testRemoveTopics({
				existingTopics: ['customer-products', 'app'],
				topics: ['something'],
				topicsToReplaceWith: ['customer-products', 'app'],
			})
		})

		test('returns topics from replace request', async () => {
			const outputTopics = ['customer-products']
			nock('https://api.github.com')
				.get('/repos/Test-Owner/Test-Repo/topics')
				.reply(200, {
					names: ['customer-products', 'app'],
				})
			nock('https://api.github.com')
				.put('/repos/Test-Owner/Test-Repo/topics')
				.reply(200, {
					names: outputTopics,
				})

			const topics = await removeTopics({ githubUrl, token: 'someToken', topics: ['app'] })
			expect(topics).toEqual(outputTopics)
		})

		test('does not update topics if no changes are made and outputs topics', async () => {
			const outputTopics = ['customer-products', 'app']
			nock('https://api.github.com')
				.get('/repos/Test-Owner/Test-Repo/topics')
				.reply(200, {
					names: outputTopics,
				})
			// NOTE: No nock for replacing topics here

			const topics = await removeTopics({ githubUrl, token: 'someToken', topics: ['something'] })
			expect(topics).toEqual(outputTopics)
		})
	})
})
