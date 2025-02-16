import { merge } from "lume/core/utils/object.ts";
import { log } from "lume/core/utils/log.ts";
import type Site from "lume/core/site.ts";

interface Options {
  /* Titles should ideally be under 80 characters */
  warnTitleLength?: boolean;
  /* long URLs can be problematic */
  warnUrlLength?: boolean;
  /* How long is too long for titles (70) */
  thresholdLength?: number;
  /* What % of thresholdLength should be applied to URLs? (70) */
  thresholdLengthPercentage?: number;
  /* There should only be one <h1> tag per node */
  warnDuplicateHeadings?: boolean;

  /* Try to use non-common words in precious URL space! */
  warnUrlCommonWords?: boolean;
  /* Try to use non-common words in precious title space! */
  warnTitleCommonWords?: boolean;
  /* What % of common words is okay in precious space? (15) */
  thresholdCommonWordsPercent?: number;
  /* Min length for common word percentage checks */
  thresholdLengthForCWCheck?: number;

  /* This is also basic accessibility: images need alt="" attribute */
  warnImageAltAttribute?: boolean;
  /* Not using titles is a waste of indexable space. */
  warnImageTitleAttribute?: boolean;

  /* What source extensions to check? .md(x) by default. */
  extensions?: string[];
  /* URL (page.data.url) list to skip processing */
  ignore?: string[];

  /* Console, file or function */
  output?: string | ((seoWarnings: Map<string, Set<string>>) => void);
}

export const defaults: Options = {
  extensions: [".md", ".mdx"],
  ignore: ["/404.html"],
  warnTitleLength: true,
  warnUrlLength: true,
  thresholdLength: 80,
  thresholdLengthPercentage: .7,
  thresholdLengthForCWCheck: 35,
  warnDuplicateHeadings: true,
  warnTitleCommonWords: true,
  warnUrlCommonWords: true,
  thresholdCommonWordsPercent: 40,
  warnImageAltAttribute: true,
  warnImageTitleAttribute: true,
};

export default function seo(userOptions?: Options) {
  const options = merge(defaults, userOptions);

  function calculateCommonWordPercentage(title: string): number {
    const processedTitle = title.toLowerCase().replace(/[^\w\s]/g, "");
    const words = processedTitle.split(/\s+/);
    /* See README regarding internationalization */
    const commonWords = new Set([
      "the",
      "a",
      "an",
      "and",
      "but",
      "or",
      "nor",
      "for",
      "so",
      "yet",
      "to",
      "in",
      "at",
      "on",
      "by",
      "with",
      "of",
      "from",
      "as",
      "is",
      "are",
      "was",
      "were",
      "be",
      "been",
      "have",
      "has",
      "had",
      "do",
      "does",
      "did",
      "will",
      "would",
      "can",
      "could",
      "should",
      "may",
      "might",
      "must",
      "i",
      "you",
      "he",
      "she",
      "it",
      "we",
      "they",
      "me",
      "him",
      "her",
      "us",
      "them",
      "my",
      "your",
      "his",
      "hers",
      "its",
      "our",
      "their",
      "this",
      "that",
      "these",
      "those",
      "one",
      "two",
      "three",
      "four",
      "five",
      "first",
      "last",
      "new",
      "good",
      "bad",
      "man",
      "woman",
      "child",
      "time",
      "year",
      "day",
      "night",
      "now",
      "then",
      "very",
      "much",
      "many",
      "some",
      "all",
      "any",
      "most",
      "other",
      "more",
      "out",
      "up",
      "down",
      "over",
      "under",
      "again",
      "also",
      "however",
      "therefore",
      "because",
      "since",
      "while",
      "before",
      "after",
      "if",
      "unless",
      "though",
      "although",
      "even",
      "still",
      "yet",
      "now",
      "just",
      "only",
      "well",
      "too",
      "very",
      "quite",
      "rather",
      "really",
      "almost",
      "enough",
      "about",
      "above",
      "across",
      "after",
      "against",
      "along",
      "among",
      "around",
      "at",
      "before",
      "behind",
      "below",
      "beneath",
      "beside",
      "besides",
      "between",
      "beyond",
      "but",
      "by",
      "down",
      "during",
      "except",
      "for",
      "from",
      "in",
      "inside",
      "into",
      "like",
      "near",
      "next",
      "of",
      "off",
      "on",
      "onto",
      "out",
      "outside",
      "over",
      "past",
      "round",
      "since",
      "through",
      "throughout",
      "to",
      "toward",
      "towards",
      "under",
      "underneath",
      "until",
      "up",
      "upon",
      "up to",
      "with",
      "within",
      "without",
    ]);

    let commonWordCount = 0;
    for (const word of words) {
      if (commonWords.has(word)) {
        commonWordCount++;
      }
    }

    const percentage = words.length === 0
      ? 0
      : (commonWordCount / words.length) * 100;

    return percentage;
  }

  const cachedWarnings = new Map<string, Set<string>>();

  return (site: Site) => {
    function writeWarningsToFile(file: string): void {
      log.warn(
        `SEO: Warnings were issued during this run. Report saved to ${file}`,
      );
      // very similar to how the links plugin converts
      const content = JSON.stringify(
        Object.fromEntries(
          Array.from(cachedWarnings.entries())
            .map(([url, refs]) => [url, Array.from(refs)]),
        ),
        null,
        2,
      );
      Deno.writeTextFileSync(file, content);
      return;
    }

    function writeWarningsToConsole(): void {
      log.warn("SEO: Warnings were issued during this run. Report as follows:");
      const content = JSON.stringify(
        Object.fromEntries(
          Array.from(cachedWarnings.entries())
            .map(([url, refs]) => [url, Array.from(refs)]),
        ),
        null,
        2,
      );
      // TODO: pretty table-ify this somehow?
      console.dir(content);
      return;
    }

    let warningCount = 0;

    site.process(options.extensions, (pages) => {
      log.info("SEO: Running SEO checks ...");
      for (const page of pages) {
        if (page.data.url && options.ignore.includes(page.data.url)) {
          log.info(`SEO: Skipping ${page.data.url} per config.`);
          continue;
        }

        const warnings = [];

        log.info(`SEO: Processing ${page.data.url} ...`);

        if (options.warnTitleLength && page.data.title) {
          const titleLength = page.data.title.length;
          if (titleLength >= options.thresholdLength) {
            warnings[warningCount] =
              `Title is over ${options.thresholdLength} characters; less is more.`;
          }
        }

        if (options.warnUrlLength) {
          const urlLength = page.data.url.length;
          const maxLength = options.thresholdLength *
            options.thresholdLengthPercentage;
          if (urlLength >= maxLength) {
            warnings[warningCount++] =
              `URL meets or exceeds ${maxLength}, which is ${options.thresholdLengthPercentage} of the title limit; consider shortening.`;
          }
        }

        if (options.warnDuplicateHeadings && page.document) {
          const headingOneCount = page.document.querySelectorAll("h1").length;
          if (headingOneCount && headingOneCount > 1) {
            warnings[warningCount++] =
              "More than one <h1> tag. This is almost never what you want.";
          }
        }

        if (
          (options.warnImageAltAttribute || options.warnImageTitleAttribute) &&
          page.document
        ) {
          for (const img of page.document.querySelectorAll("img")) {
            if (
              img && options.warnImageAltAttribute && !img.hasAttribute("alt")
            ) {
              warnings[warningCount++] =
                "Image is missing alt attribute. This also breaks accessibility!";
            }
            if (
              img && options.warnImageTitleAttribute &&
              !img.hasAttribute("title")
            ) {
              warnings[warningCount++] =
                "Suggest using image title attributes strategically.";
            }
          }
        }

        if (
          options.warnTitleCommonWords && page.data.title &&
          page.data.title.length >= options.thresholdLengthForCWCheck
        ) {
          const titleCommonWords = calculateCommonWordPercentage(
            page.data.title,
          );
          if (titleCommonWords >= options.thresholdCommonWordsPercent) {
            warnings[warningCount++] =
              `SEO: Title has a large percentage (${titleCommonWords}) of common  words; consider revising.`;
          }
        }

        if (
          options.warnUrlCommonWords && page.data.url &&
          page.data.url.length >= options.thresholdLengthForCWCheck
        ) {
          const urlCommonWords = calculateCommonWordPercentage(page.data.url);
          if (urlCommonWords >= options.thresholdCommonWordsPercent) {
            warnings[warningCount++] =
              `SEO: URL has a large percentage (${urlCommonWords}) of common  words; consider revising.`;
          }
        }

        if (warningCount) {
          cachedWarnings.set(page.data.url, new Set(warnings));
          warningCount = 0;
        }
      }

      // Do we have anything to report?
      if (cachedWarnings.size) {
        if (typeof options.output === "function") {
          options.output(cachedWarnings);
        } else if (typeof options.output === "string") {
          writeWarningsToFile(options.output);
        } else {
          writeWarningsToConsole();
        }
      } else {
        log.info("SEO: No warnings to report! Good job! 🎉");
      }
    });
  };
}
