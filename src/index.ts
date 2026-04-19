import { App, debounce, Menu, MarkdownView, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { highlightTextInElement, rules, markJiebaReady } from "./marker";

export interface ReADHDSettings {
    readhdMode: boolean;
    readModeOnly: boolean;
}

const DEFAULT_SETTINGS: ReADHDSettings = {
    readhdMode: false,
    readModeOnly: true,
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

            menu.addItem((item) => {
                item.setTitle(this.settings.readhdMode ? "Disable reADHD" : "Enable reADHD");
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

        containerEl.empty();

        containerEl.createEl('h2', {text: '📚 reADHD'});

        new Setting(containerEl)
            .setName('Toggle reADHD mode')
            .setDesc('Toggle this to enable reADHD mode. You can also toggle this in status bar.')
            .addToggle((toggle) =>
                toggle.setValue(this.plugin.settings.readhdMode).onChange(async (value) => {
                    this.plugin.settings.readhdMode = value;
                    this.updateSettings();
                    toogleMode(this.app);
                    this.plugin.updateStatusBar();
                }));

        new Setting(containerEl)
            .setName('Only apply in reading mode')
            .setDesc('When enabled, bionic reading effect only appears in reading mode. Live preview and source mode will not be affected.')
            .addToggle((toggle) =>
                toggle.setValue(this.plugin.settings.readModeOnly).onChange(async (value) => {
                    this.plugin.settings.readModeOnly = value;
                    this.updateSettings();
                    toogleMode(this.app);
                }));

        containerEl.createEl('p', {
            text: 'Improved from Boninall\'s Obsidian-Better-Reading-Mode.',
            cls: 'setting-item-description'
        });
    }
}