interface IntlSegmenter {
    segment(input: string): Intl.SegmentDataIterable;
}

interface IntlSegmenterOptions {
    granularity?: 'grapheme' | 'word' | 'sentence';
}

declare namespace Intl {
    class Segmenter {
        constructor(locale?: string | string[], options?: IntlSegmenterOptions);
        segment(input: string): Intl.SegmentDataIterable;
    }
}

interface SegmentData {
    segment: string;
    index: number;
    input: string;
    isWordLike: boolean;
}

declare namespace Intl {
    interface SegmentDataIterable {
        [Symbol.iterator](): IterableIterator<SegmentData>;
    }
}