// i18n module for reADHD plugin
// Supports Chinese (default) and English

export type Language = 'zh' | 'en';

interface Translations {
    [key: string]: string;
}

const translations: Record<Language, Translations> = {
    zh: {
        // Status bar menu
        'status.enable': '开启 reADHD',
        'status.disable': '关闭 reADHD',
        
        // Settings - Language
        'setting.language.name': '界面语言',
        'setting.language.desc': '选择插件界面的显示语言',
        'setting.language.zh': '简体中文',
        'setting.language.en': 'English',
        
        // Settings - Toggle
        'setting.toggle.name': '开关 reADHD',
        'setting.toggle.desc': '开启或关闭视觉强调阅读效果，也可点击状态栏图标快速切换',
        
        // Settings - Reading mode only
        'setting.readMode.name': '仅在阅读模式生效',
        'setting.readMode.desc': '开启后，视觉强调效果只在阅读模式下显示，实时预览和源码模式不受影响',
        
        // Settings - Header
        'setting.header': '📚 reADHD 设置',
        
        // Footer
        'footer.credit': '基于 Boninall 的 Obsidian-Better-Reading-Mode 改进',
    },
    en: {
        // Status bar menu
        'status.enable': 'Enable reADHD',
        'status.disable': 'Disable reADHD',
        
        // Settings - Language
        'setting.language.name': 'Language',
        'setting.language.desc': 'Select the display language for the plugin interface',
        'setting.language.zh': '简体中文',
        'setting.language.en': 'English',
        
        // Settings - Toggle
        'setting.toggle.name': 'Toggle reADHD',
        'setting.toggle.desc': 'Toggle visual emphasis reading effect. You can also click the status bar icon to switch quickly',
        
        // Settings - Reading mode only
        'setting.readMode.name': 'Only apply in reading mode',
        'setting.readMode.desc': 'When enabled, visual emphasis effect only appears in reading mode. Live preview and source mode will not be affected',
        
        // Settings - Header
        'setting.header': '📚 reADHD Settings',
        
        // Footer
        'footer.credit': 'Improved from Boninall\'s Obsidian-Better-Reading-Mode',
    }
};

export function t(key: string, lang: Language): string {
    return translations[lang][key] || key;
}

export { translations };
