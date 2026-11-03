// Regression suites for source tools explicitly choose the Source editing workflow.
async function command(page, label) {
  await page.click('#writerCommandsBtn'); await page.fill('#writerCommandsSearch', label);
  await page.locator('#writerCommandsList button').filter({ has: page.locator('strong').filter({ hasText: new RegExp('^' + label + '$', 'i') }) }).click();
}
module.exports = async function sourceWorkspace(page) {
  await page.waitForFunction(() => !!document.getElementById('writing')?.jotSetMode && document.documentElement.hasAttribute('data-archive-ready'));
  await command(page, 'Source editing');
  if (!await page.isVisible('.tool-row')) await command(page, 'Journal tools');
};
module.exports.command = command;
