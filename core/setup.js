/**
 * core/setup.js
 * Interactive first-time setup wizard for global configuration.
 */
'use strict';

const readline = require('readline');
const chalk = require('chalk');
const configManager = require('./configManager');

function askQuestion(rl, query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function runSetup() {
    console.log('\n' + chalk.cyan.bold('Welcome to ZayCode v6.3! 🚀'));
    console.log(chalk.dim('It looks like your global configuration is missing an API Key. Let\'s set it up securely.\n'));

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const apiKey = await askQuestion(rl, chalk.bold('Enter your OpenRouter API Key (or press Enter to skip): '));
    const trimmedKey = apiKey.trim();

    if (trimmedKey) {
        configManager.setKey('openrouter', trimmedKey);
        console.log(chalk.green('\n✓ API Key securely saved to ~/.zaycode/config.json\n'));
    } else {
        console.log(chalk.yellow('\n⚠️ No API key provided. ZayCode will launch, but API tasks will fail until configured.\n'));
    }

    rl.close();
}

module.exports = { runSetup };
