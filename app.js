const express = require("express");
const axios = require("axios");
const _ = require("lodash");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to fetch and analyze blog data
const fetchAndAnalyzeBlogData = async (req, res, next) => {
  try {
    // Fetch data from the third-party API using Axios
    const response = await axios.get(
      "https://intent-kit-16.hasura.app/api/rest/blogs",
      {
        headers: {
          "x-hasura-admin-secret":
            "32qR4KmXOIpsGPQKMqEJHGJS27G5s7HdSKO3gdtQd2kv5e852SiYwWNfxkZOBuQ6",
        },
      }
    );
    const blogData = response.data;

    // Check if blogData is an object and has a 'blogs' property with an array value
    if (typeof blogData === "object" && Array.isArray(blogData.blogs)) {
      const blogsArray = blogData.blogs;
      const totalBlogs = blogsArray.length;
      const longestTitleBlog = _.maxBy(blogsArray, "title.length");
      const blogsWithPrivacy = blogsArray.filter((blog) =>
        blog.title.toLowerCase().includes("privacy")
      );
      const uniqueBlogTitles = _.uniqBy(blogsArray, "title");

      // Store the results in the response object
      req.blogStats = {
        totalBlogs,
        longestTitle: longestTitleBlog ? longestTitleBlog.title : null,
        blogsWithPrivacy: blogsWithPrivacy.length,
        uniqueBlogTitles,
      };

      next();
    } else {
      // Handle the case where blogData is not in the expected format
      next(new Error("Invalid blogData format"));
    }
  } catch (error) {
    // Handle errors and pass them to the error handling middleware
    next(error);
  }
};

// Middleware for blog search
const searchBlogs = (req, res, next) => {
  const query = req.query.query;
  if (!query) {
    return res.status(400).json({ error: "Query parameter is missing" });
  }
  // Perform a case-insensitive search for blogs containing the query
  const matchingBlogs = req.blogStats.uniqueBlogTitles.filter((blog) =>
    blog.title?.toLowerCase().includes(query.toLowerCase())
  );
  // Send the matching blogs as a response
  res.json({ matchingBlogs });
};

const memoizedFetchAndAnalyzeBlogData = _.memoize(
  fetchAndAnalyzeBlogData,
  () => "cached"
); // Unique cache key

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

// Use memoized middleware for /api/blog-stats
// Route to fetch and analyze blog data
// API Endpoint :http://localhost:3000/api/blog-stats
app.get("/api/blog-stats", memoizedFetchAndAnalyzeBlogData, (req, res) => {
  res.json(req.blogStats);
});

// Route for blog search
//API Endpoint : http://localhost:3000/api/blog-search?query=privacy
// Query Parameters :  /api/blog-search?query=privacy
app.get("/api/blog-search", fetchAndAnalyzeBlogData, searchBlogs);

// Start the Express server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
