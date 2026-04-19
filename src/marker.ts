import { App } from "obsidian";
import { ReADHDSettings } from "./index";

interface HighlightRule {
    regexMode: string;
    regexPattern: string;
    creator: ReplacementElementCreator;
}

type ReplacementElementCreator = (matchedText: string) => HTMLElement;

const CHINESE_REGEX = /[\u4E00-\u9FFF\u3400-\u4DBF\uF900-\uFAFF]/;
const fallbackZhSegmenter = new Intl.Segmenter('zh', { granularity: 'word' });

let jiebaReady = false;
let jiebaCutFn: ((text: string, hmm?: boolean) => string[]) | null = null;

export function markJiebaReady(cutFn: (text: string, hmm?: boolean) => string[]): void {
    jiebaReady = true;
    jiebaCutFn = cutFn;
}

function getBoldLength(wordLength: number): number {
    if (wordLength < 2) return wordLength;
    if (wordLength <= 3) return 1;
    if (wordLength === 4) return 2;
    return Math.ceil(wordLength * 0.50);
}

function createHighlightSpan(
    word: string, index: number
) {
    const parentEl = createEl("span");
    const boldEl = parentEl.createEl("span");
    boldEl.toggleClass("readhd-highlight", true);
    boldEl.setText(word.slice(0, index));
    const restPart = word.slice(index);
    const restEl = document.createTextNode(restPart);
    parentEl.appendChild(restEl);

    return parentEl;
}

function createChineseHighlightSpan(text: string): HTMLElement {
    const parentEl = createEl("span");

    let words: string[];

    if (jiebaReady && jiebaCutFn) {
        try {
            words = jiebaCutFn(text, true);
        } catch {
            words = fallbackSegment(text);
        }
    } else {
        words = fallbackSegment(text);
    }

    for (const word of words) {
        if (!CHINESE_REGEX.test(word)) {
            parentEl.appendChild(document.createTextNode(word));
            continue;
        }

        const boldLength = getBoldLength(word.length);

        const boldEl = parentEl.createEl("span");
        boldEl.toggleClass("readhd-highlight", true);
        boldEl.setText(word.slice(0, boldLength));
        const restEl = document.createTextNode(word.slice(boldLength));
        parentEl.appendChild(restEl);
    }

    return parentEl;
}

function fallbackSegment(text: string): string[] {
    const segments = [...fallbackZhSegmenter.segment(text)];
    return segments.map((s) => s.segment);
}

export const rules: HighlightRule[] = [
    {
        regexMode: 'gu',
        regexPattern: '[\\p{L}\\p{Alphabetic}\\p{Mark}\\p{Connector_Punctuation}\\p{Join_Control}\\p{Script_Extensions=Han}\\p{Script_Extensions=Hiragana}\\p{Script_Extensions=Katakana}]+|[\\uAC00-\\uD7AF]+',
        creator: (word) => {
            if (CHINESE_REGEX.test(word)) {
                return createChineseHighlightSpan(word);
            }

            const wordLength = word.length;
            const boldLength = getBoldLength(wordLength);

            if (!boldLength) return createEl("span");

            return createHighlightSpan(word, boldLength);
        }
    },
];

const compiledRules = rules.map((rule) => ({
    ...rule,
    regex: new RegExp(rule.regexPattern, rule.regexMode),
}));

export function highlightTextInElement({
                                           app, element, rules, settings
                                       }: {
    app: App, element: HTMLElement, rules: HighlightRule[], settings: ReADHDSettings
}) {
    if (!settings.readhdMode) return;
    const walker = document.createTreeWalker(
        element,
        NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
        {
            acceptNode(node) {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    return (node as Element).nodeName === 'PRE'
                        ? NodeFilter.FILTER_REJECT
                        : NodeFilter.FILTER_SKIP;
                }

                return node.textContent?.trim()
                    ? NodeFilter.FILTER_ACCEPT
                    : NodeFilter.FILTER_REJECT;
            },
        }
    );
    let node: Node | null;

    const nodesToProcess: Text[] = [];
    while ((node = walker.nextNode())) {
        if (node.nodeType === Node.TEXT_NODE) {
            nodesToProcess.push(node as Text);
        }
    }

    nodesToProcess.forEach((node) => {
        replaceTextWithElements(app, node, rules);
    });
}

function replaceTextWithElements(app: App, node: Text, rules: HighlightRule[]) {
    const textContent = node.textContent || "";
    if (!textContent) return;

    const compiledRule = compiledRules[0];
    compiledRule.regex.lastIndex = 0;
    if (!compiledRule.regex.test(textContent)) {
        return;
    }

    compiledRule.regex.lastIndex = 0;
    const fragment = document.createDocumentFragment();
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = compiledRule.regex.exec(textContent)) !== null) {
        const [part] = match;

        if (match.index > lastIndex) {
            fragment.appendChild(document.createTextNode(textContent.slice(lastIndex, match.index)));
        }

        fragment.appendChild(compiledRule.creator(part));
        lastIndex = compiledRule.regex.lastIndex;
    }

    if (lastIndex < textContent.length) {
        fragment.appendChild(document.createTextNode(textContent.slice(lastIndex)));
    }

    node.parentNode?.replaceChild(fragment, node);
}
