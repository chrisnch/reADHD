import { App, debounce, Menu, MarkdownView, Plugin, PluginSettingTab, Setting, DropdownComponent } from 'obsidian';
import { highlightTextInElement, rules, markJiebaReady } from "./marker";
import { t, Language } from "./i18n";

export interface ReADHDSettings {
    readhdMode: boolean;
    readModeOnly: boolean;
    language: Language;
}

const DEFAULT_SETTINGS: ReADHDSettings = {
    readhdMode: false,
    readModeOnly: true,
    language: 'zh',
};

const toogleMode = (app: App) => {
    const leaves = app.workspace.getLeavesOfType("markdown");
    leaves.forEach((leaf) => {
        // @ts-ignore expected-error-internal-method
        leaf.rebuildView();
    });
};

export default class ReADHDPlugin extends Plugin {
    settings: ReADHDSettings;
    statusBarEl: HTMLElement;

    async onload() {
        await this.loadSettings();

        try {
            const jiebaWasm = require('jieba-wasm');
            jiebaWasm.cut("测试", true);
            markJiebaReady(jiebaWasm.cut);
            console.log("reADHD: jieba-wasm loaded successfully");
        } catch (err) {
            console.warn("reADHD: jieba-wasm init failed, falling back to Intl.Segmenter", err);
        }

        this.initCommands();
        this.setupStatusBar();

        this.addSettingTab(new ReADHDSettingTab(this.app, this));
        this.registerMarkdownPostProcessor((el, ctx) => {
            if (this.settings.readModeOnly) {
                const file = this.app.vault.getAbstractFileByPath(ctx.sourcePath);
                if (!file) return;
                const leaves = this.app.workspace.getLeavesOfType("markdown");
                let foundPreview = false;
                for (const leaf of leaves) {
                    const view = leaf.view as MarkdownView;
                    if (view && view.file === file && view.getMode() === 'preview') {
                        foundPreview = true;
                        break;
                    }
                }
                if (!foundPreview) return;
            }
            // Add a class to the container element so we can style everything inside it together
            el.classList.add("readhd-container");
            highlightTextInElement({
                app: this.app, element: el, rules, settings: this.settings
            });
        });
    }

    setupStatusBar() {
        this.statusBarEl = this.addStatusBarItem();
        this.statusBarEl.addClass("readhd-statusbar-button");
        this.updateStatusBar();

        this.registerDomEvent(this.statusBarEl, "click", () => {
            const menu = new Menu();

            const lang = this.settings.language;
            menu.addItem((item) => {
                item.setTitle(this.settings.readhdMode ? t('status.disable', lang) : t('status.enable', lang));
                item.setIcon(this.settings.readhdMode ? "toggle-right" : "toggle-left");
                item.onClick(async () => {
                    await this.toggle(() => {
                        toogleMode(this.app);
                    });
                });
            });

            const rect = this.statusBarEl.getBoundingClientRect();
            menu.showAtPosition({
                x: rect.left,
                y: rect.top - 5,
            });
        });
    }

    updateStatusBar() {
        if (this.settings.readhdMode) {
            this.statusBarEl.setText('📚 reADHD');
            this.statusBarEl.addClass("readhd-active");
            this.statusBarEl.removeClass("readhd-inactive");
        } else {
            this.statusBarEl.setText('📚 reADHD');
            this.statusBarEl.addClass("readhd-inactive");
            this.statusBarEl.removeClass("readhd-active");
        }
    }

    toggle = async (cb?: () => void) => {
        this.settings.readhdMode = !this.settings.readhdMode;
        await this.saveSettings();
        this.updateStatusBar();
        cb?.();
    };

    onunload() {

    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    initCommands() {
        this.addCommand({
            id: 'toggle-readhd-mode',
            name: 'Toggle reADHD mode',
            callback: async () => {
                await this.toggle(() => {
                    toogleMode(this.app);
                });
            }
        });
    }
}

class ReADHDSettingTab extends PluginSettingTab {
    plugin: ReADHDPlugin;

    constructor(app: App, plugin: ReADHDPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    async applySettingsUpdate() {
        await this.plugin.saveSettings();
    }

    updateSettings = debounce(this.applySettingsUpdate.bind(this), 100);

    display(): void {
        const {containerEl} = this;
        const lang = this.plugin.settings.language;

        containerEl.empty();

        containerEl.createEl('h2', {text: t('setting.header', lang)});

        // Language selector
        new Setting(containerEl)
            .setName(t('setting.language.name', lang))
            .setDesc(t('setting.language.desc', lang))
            .addDropdown((dropdown: DropdownComponent) => {
                dropdown
                    .addOption('zh', t('setting.language.zh', lang))
                    .addOption('en', t('setting.language.en', lang))
                    .setValue(this.plugin.settings.language)
                    .onChange(async (value) => {
                        this.plugin.settings.language = value as Language;
                        await this.plugin.saveSettings();
                        // Refresh the settings tab to apply new language
                        this.display();
                    });
            });

        new Setting(containerEl)
            .setName(t('setting.toggle.name', lang))
            .setDesc(t('setting.toggle.desc', lang))
            .addToggle((toggle) =>
                toggle.setValue(this.plugin.settings.readhdMode).onChange(async (value) => {
                    this.plugin.settings.readhdMode = value;
                    this.updateSettings();
                    toogleMode(this.app);
                    this.plugin.updateStatusBar();
                }));

        new Setting(containerEl)
            .setName(t('setting.readMode.name', lang))
            .setDesc(t('setting.readMode.desc', lang))
            .addToggle((toggle) =>
                toggle.setValue(this.plugin.settings.readModeOnly).onChange(async (value) => {
                    this.plugin.settings.readModeOnly = value;
                    this.updateSettings();
                    toogleMode(this.app);
                }));

        containerEl.createEl('p', {
            text: t('footer.credit', lang),
            cls: 'setting-item-description'
        });
    }
}