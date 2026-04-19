declare module 'jieba-wasm/web' {
    export function cut(text: string, hmm?: boolean): string[];
    export default function initJieba(moduleOrPath?: string | URL | Request | Response | BufferSource | WebAssembly.Module): Promise<unknown>;
}
