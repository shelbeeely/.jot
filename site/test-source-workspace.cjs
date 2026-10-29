// Regression suites for source tools explicitly choose the Source editing workflow.
module.exports = async function sourceWorkspace(page) {
  await page.waitForFunction(() => !!document.getElementById('writing')?.jotSetMode);
  const command = async label => {
    await page.click('#writerCommandsBtn'); await page.fill('#writerCommandsSearch', label);
    await page.locator('#writerCommandsList button').filter({ has: page.locator('strong').filter({ hasText: new RegExp('^' + label + '$', 'i') }) }).click();
  };
  await command('Source editing');
  if (!await page.isVisible('.tool-row')) await command('Journal tools');
};
