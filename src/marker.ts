import { App } from "obsidian";
import { ReADHDSettings } from "./index";

interface HighlightRule {
    regexMode: string;
    regexPattern: string;
    creator: ReplacementElementCreator;
}

type ReplacementElementCreator = (matchedText: string) => HTMLElement;

const CHINESE_REGEX = /[\u4E00-\u9FFF\u3400-\u4DBF\uF900-\uFAFF]/;

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
    const segmenter = new Intl.Segmenter('zh', { granularity: 'word' });
    const segments = [...segmenter.segment(text)];
    return segments
        .map(s => s.segment);
}

export function highlightTextInElement({
                                           app, element, rules, settings
                                       }: {
    app: App, element: HTMLElement, rules: HighlightRule[], settings: ReADHDSettings
}) {
    if (!settings.readhdMode) return;
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    let node;

    const nodesToProcess: Node[] = [];
    while ((node = walker.nextNode())) {
        nodesToProcess.push(node);
    }

    nodesToProcess.forEach((node) => {
        replaceTextWithElements(app, node, rules);
    });
}

function isInsidePre(node: Node) {
    let current = node;
    while (current && current.parentNode) {
        if (current.parentNode.nodeName === 'PRE') {
            return true;
        }
        current = current.parentNode;
    }
    return false;
}

export const rules: HighlightRule[] = [
    {
        regexMode: 'gu',
        regexPattern: '[\\p{L}\\p{Alphabetic}\\p{Mark}\\p{Connector_Punctuation}\\p{Join_Control}\\p{Script_Extensions=Han}\\p{Script_Extensions=Hiragana}\\p{Script_Extensions=Katakana}]+|[\\uAC00-\\uD7AF]+',
        creator: (word) => {
            if (CHINESE_REGEX.test(word)) {
                return createChineseHighlightSpan(word);
            }

            const wordLength = word.trim().length;
            const boldLength = getBoldLength(wordLength);

            if (!boldLength) return createEl("span");

            return createHighlightSpan(word.trim(), boldLength);
        }
    },
];


function replaceTextWithElements(app: App, node: Node, rules: HighlightRule[]) {
    if (node.nodeType === Node.TEXT_NODE && !isInsidePre(node)) {
        let textContent = node.textContent || "";

        rules.forEach((rule) => {
            let newTextContent = "";
            let match;
            const regex = new RegExp(rule.regexPattern, rule.regexMode);
            let lastIndex = 0;

            while ((match = regex.exec(textContent)) !== null) {
                const part = match[0];

                const precedingText = textContent.substring(lastIndex, match.index);
                newTextContent += precedingText;

                const replacementElement = rule.creator(part);
                newTextContent += `<span data-replace>${replacementElement.outerHTML}</span>`;
                lastIndex = regex.lastIndex;
            }

            newTextContent += textContent.substring(lastIndex);
            textContent = newTextContent;
        });

        const parser = new DOMParser();
        const doc = parser.parseFromString(textContent, "text/html");
        Array.from(doc.body.childNodes).forEach((newNode) => {
            if (newNode.nodeName === "#text") {
                node.parentNode?.insertBefore(newNode.cloneNode(true), node);
                return;
            }

            if (newNode.nodeName === "SPAN" && (newNode as Element).getAttribute("data-replace") === "") {
                Array.from(newNode.childNodes).forEach((child) => {
                    node.parentNode?.insertBefore(child.cloneNode(true), node);
                });
            } else {
                node.parentNode?.insertBefore(newNode.cloneNode(true), node);
            }
        });

        node.parentNode?.removeChild(node);
    }
}