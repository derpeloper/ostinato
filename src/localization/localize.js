/**
 * @file localize.js
 * @description handles providing translations for commands and responses based on the user's locale.
 * "lost in translation."
 */
const fs = require('fs');
const path = require('path');

const cache = new Map();

const localeToDir = { 'es-419': 'es-ES' };

const SUPPORTED_LOCALES = [
    'en-US', 'en-GB', 'es-ES', 'es-419', 'fr', 'pt-BR', 'ko', 'da', 'de', 
    'hr', 'it', 'lt', 'hu', 'nl', 'pl', 'ro', 'fi', 'sv-SE', 'vi', 'cs', 
    'el', 'bg', 'ru', 'uk', 'hi', 'tr'
];

function getLocaleData(locale) {
    const targetLocale = SUPPORTED_LOCALES.includes(locale) ? (localeToDir[locale] || locale) : 'en-GB';

    if (cache.has(targetLocale)) {
        return cache.get(targetLocale);
    }

    const localeDir = path.resolve(__dirname, 'locales', targetLocale);
    
    let commands = {};
    let responses = {};

    try {
        const commandsPath = path.join(localeDir, 'commands.json');
        if (fs.existsSync(commandsPath)) {
            commands = JSON.parse(fs.readFileSync(commandsPath, 'utf8'));
        }

        const responsesPath = path.join(localeDir, 'responses.json');
        if (fs.existsSync(responsesPath)) {
            responses = JSON.parse(fs.readFileSync(responsesPath, 'utf8'));
        }
    } catch (e) {
        console.error(`[localize] Error loading locale data for ${targetLocale}:`, e);
    }

    const data = { commands, responses };
    cache.set(targetLocale, data);
    return data;
}

function getNestedValue(obj, keyPath) {
    return keyPath.split('.').reduce((acc, part) => acc && acc[part], obj);
}

function localize(locale, key, variables = {}) {
    let data = getLocaleData(locale);
    let str = getNestedValue(data, key);

    if (!str && locale !== 'en-GB') {
        const fallbackData = getLocaleData('en-GB');
        str = getNestedValue(fallbackData, key);
    }
    if (!str) {
        return `[Missing: ${key}]`;
    }

    if (typeof str === 'string') {
        for (const [varName, varValue] of Object.entries(variables)) {
            str = str.replace(new RegExp(`{${varName}}`, 'g'), String(varValue));
        }
    }

    return str;
}

function getCommandLocalizations(group, commandName) {
    const nameLocalizations = {};
    const descriptionLocalizations = {};

    for (const loc of SUPPORTED_LOCALES) {
        const data = getLocaleData(loc);
        const cmd = getNestedValue(data, `commands.${group}.${commandName}`);
        if (cmd) {
            nameLocalizations[loc] = cmd.name;
            descriptionLocalizations[loc] = cmd.description;
        }
    }

    return { nameLocalizations, descriptionLocalizations };
}

function getOptionLocalizations(group, commandName, optionName) {
    const nameLocalizations = {};
    const descriptionLocalizations = {};

    for (const loc of SUPPORTED_LOCALES) {
        const data = getLocaleData(loc);
        const opt = getNestedValue(data, `commands.${group}.${commandName}.options.${optionName}`);
        if (opt && opt.name && opt.description) {
            nameLocalizations[loc] = opt.name;
            descriptionLocalizations[loc] = opt.description;
        }
    }

    return { nameLocalizations, descriptionLocalizations };
}

function getSubcommandLocalizations(group, commandName, subcommandName) {
    const nameLocalizations = {};
    const descriptionLocalizations = {};

    for (const loc of SUPPORTED_LOCALES) {
        const data = getLocaleData(loc);
        const sub = getNestedValue(data, `commands.${group}.${commandName}.subcommands.${subcommandName}`)
            || getNestedValue(data, `commands.${group}.${commandName}.options.${subcommandName}`);
        if (sub && sub.name && sub.description) {
            nameLocalizations[loc] = sub.name;
            descriptionLocalizations[loc] = sub.description;
        }
    }

    return { nameLocalizations, descriptionLocalizations };
}

function getSubcommandGroupLocalizations(group, commandName, groupName) {
    const nameLocalizations = {};
    const descriptionLocalizations = {};

    for (const loc of SUPPORTED_LOCALES) {
        const data = getLocaleData(loc);
        const grp = getNestedValue(data, `commands.${group}.${commandName}.subcommandGroups.${groupName}`)
            || getNestedValue(data, `commands.${group}.${commandName}.groups.${groupName}`);
        if (grp && grp.name && grp.description) {
            nameLocalizations[loc] = grp.name;
            descriptionLocalizations[loc] = grp.description;
        }
    }

    return { nameLocalizations, descriptionLocalizations };
}

function getDeepOptionLocalizations(group, ...pathSegments) {
    const nameLocalizations = {};
    const descriptionLocalizations = {};

    const fullPath = `commands.${group}.${pathSegments.join('.')}`;

    for (const loc of SUPPORTED_LOCALES) {
        const data = getLocaleData(loc);
        const opt = getNestedValue(data, fullPath);
        if (opt && opt.name && opt.description) {
            nameLocalizations[loc] = opt.name;
            descriptionLocalizations[loc] = opt.description;
        }
    }

    return { nameLocalizations, descriptionLocalizations };
}

module.exports = {
    localize,
    getCommandLocalizations,
    getOptionLocalizations,
    getSubcommandLocalizations,
    getSubcommandGroupLocalizations,
    getDeepOptionLocalizations
};
