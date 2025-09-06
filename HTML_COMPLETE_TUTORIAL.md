# Complete HTML Tutorial: From Beginner to Advanced

## Table of Contents
1. [What is HTML?](#what-is-html)
2. [HTML Document Structure](#html-document-structure)
3. [Basic HTML Elements](#basic-html-elements)
4. [Text Formatting](#text-formatting)
5. [Links and Navigation](#links-and-navigation)
6. [Images and Media](#images-and-media)
7. [Lists](#lists)
8. [Tables](#tables)
9. [Forms](#forms)
10. [Semantic HTML](#semantic-html)
11. [HTML5 Features](#html5-features)
12. [Best Practices](#best-practices)
13. [Common Mistakes to Avoid](#common-mistakes-to-avoid)
14. [Practice Exercises](#practice-exercises)

---

## What is HTML?

HTML (HyperText Markup Language) is the standard markup language for creating web pages. It describes the structure of a web page and consists of a series of elements that tell browsers how to display the content.

**Key Points:**
- HTML is not a programming language; it's a markup language
- HTML uses tags to mark up content
- HTML documents are plain text files with `.html` extension
- Browsers interpret HTML to display web pages

---

## HTML Document Structure

Every HTML document follows a basic structure:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Page Title</title>
</head>
<body>
    <!-- Content goes here -->
</body>
</html>
```

**Explanation of each part:**

1. **`<!DOCTYPE html>`** - Declares this is an HTML5 document
2. **`<html>`** - Root element containing the entire page
3. **`<head>`** - Contains metadata about the document
4. **`<meta charset="UTF-8">`** - Specifies character encoding
5. **`<meta name="viewport">`** - Makes the page responsive for mobile devices
6. **`<title>`** - Sets the page title (shown in browser tab)
7. **`<body>`** - Contains all visible content

---

## Basic HTML Elements

### Headings
HTML provides 6 levels of headings:

```html
<h1>Main Heading (Most Important)</h1>
<h2>Subheading</h2>
<h3>Section Heading</h3>
<h4>Subsection Heading</h4>
<h5>Minor Heading</h5>
<h6>Least Important Heading</h6>
```

**Best Practice:** Use only one `<h1>` per page for SEO and accessibility.

### Paragraphs
```html
<p>This is a paragraph of text. It can contain multiple sentences and will automatically wrap to new lines.</p>
<p>This is another paragraph with some <strong>bold text</strong> and <em>italic text</em>.</p>
```

### Line Breaks and Horizontal Rules
```html
<p>This text will break<br>to a new line here.</p>
<hr>
<p>This paragraph appears after a horizontal line.</p>
```

---

## Text Formatting

### Basic Text Formatting
```html
<strong>Bold text (semantic importance)</strong>
<b>Bold text (visual only)</b>
<em>Italic text (semantic emphasis)</em>
<i>Italic text (visual only)</i>
<mark>Highlighted text</mark>
<small>Smaller text</small>
<del>Deleted text</del>
<ins>Inserted text</ins>
<sub>Subscript</sub>
<sup>Superscript</sup>
```

### Code and Preformatted Text
```html
<code>inline code</code>
<pre>
This text preserves
    spaces and line breaks
        exactly as written
</pre>
```

---

## Links and Navigation

### Basic Links
```html
<!-- External link -->
<a href="https://www.example.com">Visit Example.com</a>

<!-- Internal link to another page -->
<a href="about.html">About Us</a>

<!-- Link to a specific section -->
<a href="#section1">Go to Section 1</a>

<!-- Email link -->
<a href="mailto:contact@example.com">Send us an email</a>

<!-- Phone link -->
<a href="tel:+1234567890">Call us</a>
```

### Link Attributes
```html
<a href="https://www.example.com" 
   target="_blank" 
   rel="noopener noreferrer"
   title="Visit our website">
   Visit Example.com
</a>
```

**Attributes explained:**
- `target="_blank"` - Opens link in new tab
- `rel="noopener noreferrer"` - Security best practice for external links
- `title` - Tooltip shown on hover

---

## Images and Media

### Basic Images
```html
<img src="path/to/image.jpg" alt="Description of the image">
```

### Image with Attributes
```html
<img src="logo.png" 
     alt="Company Logo" 
     width="200" 
     height="100"
     loading="lazy">
```

**Important attributes:**
- `src` - Path to the image file
- `alt` - Alternative text (required for accessibility)
- `width/height` - Dimensions (can be CSS instead)
- `loading="lazy"` - Loads image only when needed

### Responsive Images
```html
<img src="small.jpg" 
     srcset="small.jpg 300w, medium.jpg 600w, large.jpg 900w"
     sizes="(max-width: 600px) 300px, (max-width: 900px) 600px, 900px"
     alt="Responsive image">
```

### Video and Audio
```html
<!-- Video -->
<video width="320" height="240" controls>
    <source src="movie.mp4" type="video/mp4">
    <source src="movie.webm" type="video/webm">
    Your browser does not support the video tag.
</video>

<!-- Audio -->
<audio controls>
    <source src="audio.mp3" type="audio/mpeg">
    <source src="audio.ogg" type="audio/ogg">
    Your browser does not support the audio tag.
</audio>
```

---

## Lists

### Unordered Lists
```html
<ul>
    <li>First item</li>
    <li>Second item</li>
    <li>Third item</li>
</ul>
```

### Ordered Lists
```html
<ol>
    <li>First step</li>
    <li>Second step</li>
    <li>Third step</li>
</ol>

<!-- Custom numbering -->
<ol start="5" type="A">
    <li>Item E</li>
    <li>Item F</li>
</ol>
```

### Definition Lists
```html
<dl>
    <dt>HTML</dt>
    <dd>HyperText Markup Language</dd>
    
    <dt>CSS</dt>
    <dd>Cascading Style Sheets</dd>
</dl>
```

### Nested Lists
```html
<ul>
    <li>Main item 1
        <ul>
            <li>Sub item 1.1</li>
            <li>Sub item 1.2</li>
        </ul>
    </li>
    <li>Main item 2</li>
</ul>
```

---

## Tables

### Basic Table Structure
```html
<table>
    <thead>
        <tr>
            <th>Header 1</th>
            <th>Header 2</th>
            <th>Header 3</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>Row 1, Cell 1</td>
            <td>Row 1, Cell 2</td>
            <td>Row 1, Cell 3</td>
        </tr>
        <tr>
            <td>Row 2, Cell 1</td>
            <td>Row 2, Cell 2</td>
            <td>Row 2, Cell 3</td>
        </tr>
    </tbody>
</table>
```

### Table with Attributes
```html
<table border="1" cellpadding="10" cellspacing="5">
    <tr>
        <th colspan="2">Merged Header</th>
        <th>Single Header</th>
    </tr>
    <tr>
        <td rowspan="2">Merged Cell</td>
        <td>Cell 2</td>
        <td>Cell 3</td>
    </tr>
    <tr>
        <td>Cell 5</td>
        <td>Cell 6</td>
    </tr>
</table>
```

**Table attributes:**
- `colspan` - Merge cells horizontally
- `rowspan` - Merge cells vertically
- `border` - Add borders (use CSS instead in modern development)

---

## Forms

### Basic Form Structure
```html
<form action="/submit" method="POST">
    <label for="username">Username:</label>
    <input type="text" id="username" name="username" required>
    
    <label for="password">Password:</label>
    <input type="password" id="password" name="password" required>
    
    <button type="submit">Submit</button>
</form>
```

### Input Types
```html
<!-- Text inputs -->
<input type="text" placeholder="Enter text">
<input type="email" placeholder="Enter email">
<input type="password" placeholder="Enter password">
<input type="number" min="0" max="100" step="1">
<input type="tel" pattern="[0-9]{3}-[0-9]{3}-[0-9]{4}">

<!-- Date and time -->
<input type="date">
<input type="time">
<input type="datetime-local">

<!-- File upload -->
<input type="file" accept="image/*">

<!-- Hidden input -->
<input type="hidden" name="user_id" value="123">
```

### Form Elements
```html
<!-- Textarea -->
<label for="message">Message:</label>
<textarea id="message" name="message" rows="4" cols="50"></textarea>

<!-- Select dropdown -->
<label for="country">Country:</label>
<select id="country" name="country">
    <option value="">Select a country</option>
    <option value="us">United States</option>
    <option value="ca">Canada</option>
    <option value="uk">United Kingdom</option>
</select>

<!-- Radio buttons -->
<fieldset>
    <legend>Gender:</legend>
    <input type="radio" id="male" name="gender" value="male">
    <label for="male">Male</label>
    
    <input type="radio" id="female" name="gender" value="female">
    <label for="female">Female</label>
</fieldset>

<!-- Checkboxes -->
<fieldset>
    <legend>Interests:</legend>
    <input type="checkbox" id="sports" name="interests" value="sports">
    <label for="sports">Sports</label>
    
    <input type="checkbox" id="music" name="interests" value="music">
    <label for="music">Music</label>
</fieldset>
```

### Form Validation
```html
<form>
    <input type="text" required minlength="3" maxlength="50">
    <input type="email" required pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$">
    <input type="number" min="18" max="120">
    <button type="submit">Submit</button>
</form>
```

---

## Semantic HTML

Semantic HTML uses meaningful tags that clearly describe their purpose:

### Document Structure
```html
<header>
    <nav>
        <ul>
            <li><a href="#home">Home</a></li>
            <li><a href="#about">About</a></li>
        </ul>
    </nav>
</header>

<main>
    <article>
        <section>
            <h2>Article Section</h2>
            <p>Content here...</p>
        </section>
    </article>
    
    <aside>
        <h3>Related Information</h3>
        <p>Sidebar content...</p>
    </aside>
</main>

<footer>
    <p>&copy; 2024 Your Company</p>
</footer>
```

### Content Semantics
```html
<main>Main content area</main>
<article>Self-contained composition</article>
<section>Thematic grouping of content</section>
<aside>Content related to main content</aside>
<header>Introductory content</header>
<footer>Footer content</footer>
<nav>Navigation section</nav>
<figure>Self-contained content (image, diagram, etc.)</figure>
<figcaption>Caption for figure</figcaption>
<time>Time or date</time>
<mark>Highlighted text</mark>
<cite>Citation</cite>
<blockquote>Block quotation</blockquote>
```

---

## HTML5 Features

### New Input Types
```html
<input type="color">
<input type="range" min="0" max="100">
<input type="search">
<input type="url">
<input type="week">
<input type="month">
```

### Data Attributes
```html
<div data-user-id="123" data-role="admin" data-custom="value">
    Custom data attributes
</div>
```

### Content Editable
```html
<div contenteditable="true">
    This content can be edited by the user
</div>
```

### Drag and Drop
```html
<div draggable="true" ondragstart="drag(event)">
    Draggable element
</div>
<div ondrop="drop(event)" ondragover="allowDrop(event)">
    Drop zone
</div>
```

---

## Best Practices

### 1. Accessibility
```html
<!-- Always include alt text for images -->
<img src="image.jpg" alt="Descriptive text">

<!-- Use proper heading hierarchy -->
<h1>Main Title</h1>
<h2>Section Title</h2>
<h3>Subsection Title</h3>

<!-- Label all form inputs -->
<label for="name">Name:</label>
<input type="text" id="name" name="name">
```

### 2. SEO
```html
<!-- Use descriptive title tags -->
<title>Page Title - Company Name</title>

<!-- Include meta description -->
<meta name="description" content="Brief description of the page">

<!-- Use semantic HTML -->
<main>
    <article>
        <h1>Article Title</h1>
        <p>Article content...</p>
    </article>
</main>
```

### 3. Performance
```html
<!-- Lazy load images -->
<img src="image.jpg" loading="lazy" alt="Description">

<!-- Use appropriate image formats -->
<picture>
    <source srcset="image.webp" type="image/webp">
    <img src="image.jpg" alt="Description">
</picture>
```

### 4. Code Quality
```html
<!-- Use lowercase for tags and attributes -->
<div class="container">
    <p>Content here</p>
</div>

<!-- Quote attribute values -->
<input type="text" name="username" value="john">

<!-- Close all tags properly -->
<p>Paragraph content</p>
<br>
<img src="image.jpg" alt="Description">
```

---

## Common Mistakes to Avoid

### 1. Forgetting Alt Text
```html
<!-- ❌ Bad -->
<img src="image.jpg">

<!-- ✅ Good -->
<img src="image.jpg" alt="Description">
```

### 2. Using Deprecated Tags
```html
<!-- ❌ Avoid these deprecated tags -->
<center>Centered text</center>
<font color="red">Red text</font>
<strike>Strikethrough text</strike>

<!-- ✅ Use CSS instead -->
<div style="text-align: center;">Centered text</div>
<span style="color: red;">Red text</span>
<del>Strikethrough text</del>
```

### 3. Improper Nesting
```html
<!-- ❌ Bad - improper nesting -->
<p>Text <div>Block element</div> more text</p>

<!-- ✅ Good - proper nesting -->
<p>Text</p>
<div>Block element</div>
<p>More text</p>
```

### 4. Missing Required Attributes
```html
<!-- ❌ Bad - missing required attributes -->
<input type="text">
<img src="image.jpg">

<!-- ✅ Good - includes required attributes -->
<input type="text" name="username" id="username">
<img src="image.jpg" alt="Description">
```

---

## Practice Exercises

### Exercise 1: Basic Page Structure
Create a simple HTML page with:
- Proper DOCTYPE and structure
- Title and meta tags
- Headings and paragraphs
- A navigation menu
- Footer with copyright

### Exercise 2: Contact Form
Create a contact form with:
- Name, email, and message fields
- Proper labels and validation
- Submit button
- Responsive design considerations

### Exercise 3: Product Listing
Create a product listing page with:
- Product images and descriptions
- Pricing information
- Add to cart buttons
- Responsive grid layout

### Exercise 4: Blog Post
Create a blog post template with:
- Article header with title and date
- Multiple sections with headings
- Images and captions
- Related articles sidebar
- Social sharing buttons

---

## Next Steps

After mastering HTML, consider learning:

1. **CSS** - For styling and layout
2. **JavaScript** - For interactivity
3. **Responsive Design** - For mobile-friendly websites
4. **Accessibility** - For inclusive web design
5. **SEO** - For search engine optimization
6. **Web Performance** - For fast-loading sites

---

## Resources

- **MDN Web Docs**: Comprehensive HTML reference
- **W3Schools**: Interactive HTML tutorials
- **HTML Validator**: Check your HTML code
- **Can I Use**: Browser compatibility information
- **Web Accessibility Initiative (WAI)**: Accessibility guidelines

---

## Conclusion

HTML is the foundation of web development. By understanding these concepts and practicing regularly, you'll be able to create well-structured, accessible, and SEO-friendly web pages. Remember to always write semantic HTML, include proper accessibility features, and follow best practices for maintainable code.

Happy coding! 🚀
