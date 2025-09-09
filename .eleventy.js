const yaml = require("js-yaml");
const { DateTime } = require("luxon");
const syntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");
const htmlmin = require("html-minifier");

module.exports = function (eleventyConfig) {
  // Don’t use .gitignore automatically
  eleventyConfig.setUseGitIgnore(false);

  // Merge data instead of overriding
  eleventyConfig.setDataDeepMerge(true);

  // Filters
  eleventyConfig.addFilter("readableDate", (dateObj) => {
    if (!dateObj) return "";
    const d = dateObj instanceof Date ? dateObj : new Date(dateObj);
    return DateTime.fromJSDate(d, { zone: "utc" }).toFormat("dd LLL yyyy");
  });

  // Optional: date(format) filter for convenience
  eleventyConfig.addFilter("date", (dateObj, format = "dd LLL yyyy") => {
    if (!dateObj) return "";
    const d = dateObj instanceof Date ? dateObj : new Date(dateObj);
    return DateTime.fromJSDate(d, { zone: "utc" }).toFormat(format);
  });

  // Syntax highlighting
  eleventyConfig.addPlugin(syntaxHighlight);

  // Support .yaml in _data
  eleventyConfig.addDataExtension("yaml", (contents) => yaml.load(contents));

  // ---------- Collections ----------
  function byDateDesc(a, b) {
    const aDate = a.date || a.data.date;
    const bDate = b.date || b.data.date;
    return (bDate ? new Date(bDate) : 0) - (aDate ? new Date(aDate) : 0);
  }

  eleventyConfig.addCollection("posts", (collection) =>
    collection.getFilteredByGlob("src/posts/*.md").sort(byDateDesc)
  );

  eleventyConfig.addCollection("recentPosts", (collection) =>
    collection.getFilteredByGlob("src/posts/*.md").sort(byDateDesc)
  );

  eleventyConfig.addCollection("featuredPosts", (collection) => {
    const all = collection.getFilteredByGlob("src/posts/*.md").sort(byDateDesc);
    const featured = all.filter((p) => p.data && p.data.featured === true);
    return (featured.length ? featured : all).slice(0, 4);
  });
  // ----------------------------------

  // Admin app must be copied verbatim so CMS works on prod and locally
  eleventyConfig.addPassthroughCopy("./src/admin");

  // Other static assets
  eleventyConfig.addPassthroughCopy({
    "./node_modules/alpinejs/dist/cdn.min.js": "./static/js/alpine.js",
    "./node_modules/prismjs/themes/prism-tomorrow.css": "./static/css/prism-tomorrow.css",
  });
  eleventyConfig.addPassthroughCopy("./src/static/img");
  eleventyConfig.addPassthroughCopy("./src/favicon.ico");

  // Minify HTML output
  eleventyConfig.addTransform("htmlmin", function (content, outputPath) {
    if (outputPath && outputPath.endsWith(".html")) {
      return htmlmin.minify(content, {
        useShortDoctype: true,
        removeComments: true,
        collapseWhitespace: true,
      });
    }
    return content;
  });

  // Allow Nunjucks in .html templates
  return {
    dir: { input: "src" },
    htmlTemplateEngine: "njk",
  };
};
