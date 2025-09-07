const yaml = require("js-yaml");
const { DateTime } = require("luxon");
const syntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");
const htmlmin = require("html-minifier");

module.exports = function (eleventyConfig) {
  // Disable automatic use of your .gitignore
  eleventyConfig.setUseGitIgnore(false);

  // Merge data instead of overriding
  eleventyConfig.setDataDeepMerge(true);

  // Human readable date filter
  eleventyConfig.addFilter("readableDate", (dateObj) => {
    if (!dateObj) return "";
    const d = dateObj instanceof Date ? dateObj : new Date(dateObj);
    return DateTime.fromJSDate(d, { zone: "utc" }).toFormat("dd LLL yyyy");
  });

  // Generic date(format) filter so templates can use | date("MMM d, yyyy")
  eleventyConfig.addFilter("date", (dateObj, format = "dd LLL yyyy") => {
    if (!dateObj) return "";
    const d = dateObj instanceof Date ? dateObj : new Date(dateObj);
    return DateTime.fromJSDate(d, { zone: "utc" }).toFormat(format);
  });

  // Syntax Highlighting for Code blocks
  eleventyConfig.addPlugin(syntaxHighlight);

  // Support .yaml in _data
  eleventyConfig.addDataExtension("yaml", (contents) => yaml.load(contents));

  // ---------- Collections ----------
  function byDateDesc(a, b) {
    const aDate = a.date || a.data.date;
    const bDate = b.date || b.data.date;
    return (bDate ? new Date(bDate) : 0) - (aDate ? new Date(aDate) : 0);
  }

  eleventyConfig.addCollection("posts", (collection) => {
    return collection.getFilteredByGlob("src/posts/*.md").sort(byDateDesc);
  });

  eleventyConfig.addCollection("recentPosts", (collection) => {
    return collection.getFilteredByGlob("src/posts/*.md").sort(byDateDesc);
  });

  eleventyConfig.addCollection("featuredPosts", (collection) => {
    const all = collection.getFilteredByGlob("src/posts/*.md").sort(byDateDesc);
    const featured = all.filter((p) => p.data && p.data.featured === true);
    return (featured.length ? featured : all).slice(0, 4);
  });
  // ---------------------------------

  // Treat the whole CMS admin folder as static (no Nunjucks parsing)
  eleventyConfig.addPassthroughCopy("./src/admin");
  eleventyConfig.ignores.add("src/admin/**");

  // Copy other static assets
  eleventyConfig.addPassthroughCopy({
    "./node_modules/alpinejs/dist/cdn.min.js": "./static/js/alpine.js",
    "./node_modules/prismjs/themes/prism-tomorrow.css": "./static/css/prism-tomorrow.css",
  });
  eleventyConfig.addPassthroughCopy("./src/static/img");
  eleventyConfig.addPassthroughCopy("./src/favicon.ico");

  // Minify HTML
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

  // Treat .html as Nunjucks so you can write .html templates
  return {
    dir: {
      input: "src",
    },
    htmlTemplateEngine: "njk",
  };
};
