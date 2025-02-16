# lume-basic-seo : Basic SEO checks for Lume sites

A basic SEO plugin for Lume to help avoid common content pitfalls. Currently in
alpha state, so not quite yet ready for production.

## One Plugin: Many Checks

The plugin checks for the following common mistakes that can result in a penalty
when it comes to how your site is indexed. Currently, checks are:

- Make sure titles are under 80 characters, this helps their chances of being
  indexed.
- Make sure URLs are under 70% (default) of title length, for the same reason.
- Make sure only one `<h1>` element exists in a page.
- Make sure heading elements are used in semantic order (H1 - H5).
- Make sure titles and URLs contain a relatively low percentage of
  [common words][1].
- Make sure images have alt="" and title="" attributes. This helps
  accessibility, and boosts image search strategies.
- More checks coming soon (see ideas below!)

This plugin is meant to run in conjunction with the [Check URLs][2] and
[Metas][3] plugins for a comprehensive approach to managing SEO factors. It is
not meant to be a self-contained solution.

## Installation

TODO (not yet published on Deno)

Grab this repo, copy the `mod.ts` file to the Lume project you want to use it
with (save it in `src/_plugins/seo/mod.ts` as an example). Then import it like
you would any other plugin in lume, in `plugins.ts`, passing any options you
like. This loads it and configures output to go to `_seo-report.json`:

```ts
import seo from "./src/_plugins/seo/mod.ts";

...

.use(seo({ output: "_seo-report.json" }))
```

All checks are optional, and default values can be overridden. Like the Check
URLs plugin, you can log to a file, a function, or standard output / standard
error (default). Options are documented in the code; all have reasonable
defaults (it's easiest to just show the relevant code):

```ts
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
  /* Warn if heading elements are used out of order? */
  warnHeadingOrder?: boolean;

  /* Try to use non-common words in precious URL space! */
  warnUrlCommonWords?: boolean;
  /* Try to use non-common words in precious title space! */
  warnTitleCommonWords?: boolean;
  /* What % of common words is okay in precious space? (15) */
  thresholdCommonWordsPercent?: number;
  /* Min length for common word percentage checks */
  thresholdLengthForCWCheck?: number;
  /* Inject your own set of common words */
  userCommonWordSet?: Set<string>;

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
  warnHeadingOrder: true,
  warnTitleCommonWords: true,
  warnUrlCommonWords: true,
  thresholdCommonWordsPercent: 40,
  warnImageAltAttribute: true,
  warnImageTitleAttribute: true,
};
```

_**It is expected that the default settings will be quite noisy.**_ I suggest
looking at the warnings, addressing them as best you can while remembering that
it's humans that we must really optimize for, and then dial settings back until
you're happy with the output.

Don't make your content _less_ readable by reacting to these warnings. Take some
time to think about how to use fewer words, or fewer common words. Titles and
URLs can be too short, too. It's always a subjective call to get balance between
impressing robots and visitors the same.

## Background

This plugin was written by [Tim Post][4] after sharing an initial ad-hoc script
that accomplished a few of the tasks this plugin handles. It was immediately
clear that a more comprehensive plugin would be appreciated by the Lume
community, so it was polished up a bit and published.

Most of the checks are based on hard-earned lessons Tim undertook while working
at Stack Overflow and leading the first couple of comprehensive quality
initiatives; many of these little fixes are what kept the scrapers from
overtaking the original site.

## Internationalization

There's two parts of this plugin that are hard-coded English:

- The list of common words in the function that evaluates them, and,
- The warnings / logging phrases.

For the first, there's an option `userCommonWordSet` where you can pass your own
set of words similar to what's in the plugin. Just make sure they really are
common in the topic / setting.

For the logging / warnings, there's no clear / clean way for
internationalization in plugins that I know of. What I suggest is forking the
plugin, then renaming it to `lume-basic-seo-XX`, where `XX` is the two-letter
language code. Send me a link and I'll link to it here.

It's probably easiest to just pass the custom common word set.

## Support & Requesting Features

Use GH issues, or find me in Lume's Discord server (issues almost guarantees a
faster response). I'm disabled and don't have a ton of productive free time, but
I'm happy to help. If you add a check that you think would be beneficial for
everyone, consider sending me a PR to include it, just make sure you remember to
update the options and option defaults.

## Next-up Ideas For Checks / Features

- Analyze site tags dynamically to find the most-used tags, and optionally make
  them the beginning of titles
- Allow frontmatter to control processing (e.g. `seo: false` to have a post
  ignored) (in-progress)
- Examine `page.data.metas` settings and do some length and common word checks
  if found.

## Credits

This plugin borrows some design ideas and even a little code from the
[Check URLs][2] plugin, as it manages a similar type of lifting. Plus, I really
liked how it lets you configure output.

[1]: https://en.wikipedia.org/wiki/Most_common_words_in_English
[2]: https://lume.land/plugins/check_urls/
[3]: https://lume.land/plugins/metas/
[4]: https://timthepost.deno.dev
