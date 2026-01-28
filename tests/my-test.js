test('My Test', async () => {
	const button = await $('button');
	await button.click();

	await browser.pause(3000);
});
