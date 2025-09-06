# Complete CSS Tutorial: From Beginner to Advanced

## Table of Contents
1. [What is CSS?](#what-is-css)
2. [CSS Syntax and Structure](#css-syntax-and-structure)
3. [CSS Selectors](#css-selectors)
4. [CSS Properties](#css-properties)
5. [CSS Box Model](#css-box-model)
6. [CSS Layout](#css-layout)
7. [CSS Flexbox](#css-flexbox)
8. [CSS Grid](#css-grid)
9. [CSS Responsive Design](#css-responsive-design)
10. [CSS Animations and Transitions](#css-animations-and-transitions)
11. [CSS Best Practices](#css-best-practices)
12. [CSS Frameworks](#css-frameworks)
13. [Practice Exercises](#practice-exercises)

---

## What is CSS?

CSS (Cascading Style Sheets) is a stylesheet language used to describe the presentation of HTML documents. It controls how elements look, are positioned, and behave on web pages.

**Key Points:**
- CSS separates content (HTML) from presentation (styling)
- CSS can control colors, fonts, layouts, animations, and more
- CSS follows a cascading rule system (hence the name)
- CSS works with all modern browsers

---

## CSS Syntax and Structure

### Basic CSS Rule Structure
```css
selector {
    property: value;
    property: value;
}
```

### Example
```css
h1 {
    color: blue;
    font-size: 24px;
    text-align: center;
}
```

### CSS Comments
```css
/* This is a CSS comment */
/* 
   Multi-line
   CSS comment 
*/
```

---

## CSS Selectors

### 1. Element Selectors
```css
/* Select all h1 elements */
h1 {
    color: red;
}

/* Select all paragraphs */
p {
    font-size: 16px;
}
```

### 2. Class Selectors
```css
/* Select elements with class "highlight" */
.highlight {
    background-color: yellow;
}

/* Select elements with multiple classes */
.button.primary {
    background-color: blue;
}
```

### 3. ID Selectors
```css
/* Select element with id "header" */
#header {
    background-color: black;
    color: white;
}
```

### 4. Attribute Selectors
```css
/* Select elements with specific attributes */
input[type="text"] {
    border: 1px solid gray;
}

/* Select elements with attributes containing text */
a[href*="example"] {
    color: green;
}
```

### 5. Pseudo-class Selectors
```css
/* Select links on hover */
a:hover {
    color: red;
}

/* Select first child */
li:first-child {
    font-weight: bold;
}

/* Select even rows in tables */
tr:nth-child(even) {
    background-color: #f2f2f2;
}
```

### 6. Pseudo-element Selectors
```css
/* Add content before elements */
p::before {
    content: "→ ";
}

/* Style first line of text */
p::first-line {
    font-weight: bold;
}
```

### 7. Combinator Selectors
```css
/* Descendant selector (space) */
div p {
    margin: 10px;
}

/* Child selector (>) */
div > p {
    padding: 5px;
}

/* Adjacent sibling selector (+) */
h1 + p {
    font-size: 18px;
}

/* General sibling selector (~) */
h1 ~ p {
    color: gray;
}
```

---

## CSS Properties

### Text Properties
```css
/* Font properties */
font-family: Arial, sans-serif;
font-size: 16px;
font-weight: bold;
font-style: italic;
line-height: 1.5;

/* Text properties */
color: #333333;
text-align: center;
text-decoration: underline;
text-transform: uppercase;
text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
```

### Background Properties
```css
/* Background properties */
background-color: #ffffff;
background-image: url('image.jpg');
background-repeat: no-repeat;
background-position: center;
background-size: cover;
background-attachment: fixed;
```

### Border Properties
```css
/* Border properties */
border: 2px solid black;
border-width: 2px;
border-style: solid;
border-color: black;
border-radius: 10px;
```

### Margin and Padding
```css
/* Margin (outside spacing) */
margin: 20px;
margin-top: 10px;
margin-right: 15px;
margin-bottom: 10px;
margin-left: 15px;

/* Padding (inside spacing) */
padding: 20px;
padding-top: 10px;
padding-right: 15px;
padding-bottom: 10px;
padding-left: 15px;
```

### Width and Height
```css
/* Size properties */
width: 300px;
height: 200px;
max-width: 100%;
min-height: 100vh;
```

---

## CSS Box Model

The CSS box model describes how elements are sized and spaced:

```
┌─────────────────────────────────────┐
│              Margin                 │
│  ┌───────────────────────────────┐  │
│  │            Border             │  │
│  │  ┌─────────────────────────┐  │  │
│  │  │         Padding         │  │  │
│  │  │  ┌───────────────────┐  │  │  │
│  │  │  │      Content      │  │  │  │
│  │  │  └───────────────────┘  │  │  │
│  │  └─────────────────────────┘  │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

### Box Model Properties
```css
.box {
    /* Content dimensions */
    width: 200px;
    height: 100px;
    
    /* Padding */
    padding: 20px;
    
    /* Border */
    border: 2px solid black;
    
    /* Margin */
    margin: 10px;
    
    /* Box sizing */
    box-sizing: border-box; /* Include padding and border in width/height */
}
```

---

## CSS Layout

### Display Property
```css
/* Block elements (take full width, create new lines) */
.block-element {
    display: block;
}

/* Inline elements (only take needed width, no line breaks) */
.inline-element {
    display: inline;
}

/* Inline-block (inline but with block properties) */
.inline-block-element {
    display: inline-block;
}

/* Hidden elements */
.hidden-element {
    display: none;
}
```

### Position Property
```css
/* Static (default) */
.static {
    position: static;
}

/* Relative (relative to normal position) */
.relative {
    position: relative;
    top: 10px;
    left: 20px;
}

/* Absolute (relative to nearest positioned ancestor) */
.absolute {
    position: absolute;
    top: 0;
    right: 0;
}

/* Fixed (relative to viewport) */
.fixed {
    position: fixed;
    top: 20px;
    right: 20px;
}

/* Sticky (sticky when scrolling) */
.sticky {
    position: sticky;
    top: 0;
}
```

### Float Property
```css
/* Float elements left or right */
.float-left {
    float: left;
}

.float-right {
    float: right;
}

/* Clear floats */
.clear {
    clear: both;
}
```

---

## CSS Flexbox

Flexbox is a modern layout method for creating flexible, responsive layouts.

### Flex Container Properties
```css
.flex-container {
    display: flex;
    
    /* Direction */
    flex-direction: row; /* row | row-reverse | column | column-reverse */
    
    /* Wrap */
    flex-wrap: wrap; /* nowrap | wrap | wrap-reverse */
    
    /* Justify content (main axis) */
    justify-content: center; /* flex-start | flex-end | center | space-between | space-around */
    
    /* Align items (cross axis) */
    align-items: center; /* flex-start | flex-end | center | baseline | stretch */
    
    /* Align content (multiple lines) */
    align-content: space-between; /* flex-start | flex-end | center | space-between | space-around | stretch */
}
```

### Flex Item Properties
```css
.flex-item {
    /* Order */
    order: 1;
    
    /* Flex grow */
    flex-grow: 1;
    
    /* Flex shrink */
    flex-shrink: 1;
    
    /* Flex basis */
    flex-basis: 200px;
    
    /* Shorthand */
    flex: 1 1 200px; /* grow shrink basis */
    
    /* Align self */
    align-self: center;
}
```

### Flexbox Examples
```css
/* Navigation menu */
.nav {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

/* Card layout */
.card-container {
    display: flex;
    flex-wrap: wrap;
    gap: 20px;
}

.card {
    flex: 1 1 300px;
}
```

---

## CSS Grid

CSS Grid is a powerful layout system for creating two-dimensional layouts.

### Grid Container Properties
```css
.grid-container {
    display: grid;
    
    /* Define columns */
    grid-template-columns: 200px 1fr 200px;
    grid-template-columns: repeat(3, 1fr);
    grid-template-columns: minmax(200px, 1fr);
    
    /* Define rows */
    grid-template-rows: 100px 1fr 100px;
    
    /* Gap between items */
    gap: 20px;
    row-gap: 20px;
    column-gap: 20px;
    
    /* Align items */
    justify-items: center;
    align-items: center;
}
```

### Grid Item Properties
```css
.grid-item {
    /* Position in grid */
    grid-column: 1 / 3; /* Start at line 1, end at line 3 */
    grid-row: 2 / 4;
    
    /* Span multiple cells */
    grid-column: span 2;
    grid-row: span 2;
    
    /* Self alignment */
    justify-self: center;
    align-self: center;
}
```

### Grid Examples
```css
/* Basic grid layout */
.page-layout {
    display: grid;
    grid-template-areas: 
        "header header header"
        "sidebar main aside"
        "footer footer footer";
    grid-template-columns: 200px 1fr 200px;
    grid-template-rows: 80px 1fr 100px;
    min-height: 100vh;
}

.header { grid-area: header; }
.sidebar { grid-area: sidebar; }
.main { grid-area: main; }
.aside { grid-area: aside; }
.footer { grid-area: footer; }
```

---

## CSS Responsive Design

### Media Queries
```css
/* Mobile first approach */
.container {
    width: 100%;
    padding: 10px;
}

/* Tablet and up */
@media (min-width: 768px) {
    .container {
        width: 750px;
        margin: 0 auto;
        padding: 20px;
    }
}

/* Desktop and up */
@media (min-width: 1024px) {
    .container {
        width: 1000px;
        padding: 30px;
    }
}
```

### Responsive Units
```css
.responsive-element {
    /* Relative units */
    font-size: 1rem; /* Relative to root font size */
    width: 50%; /* Relative to parent */
    height: 50vh; /* Relative to viewport height */
    margin: 2em; /* Relative to element's font size */
    
    /* Viewport units */
    width: 100vw; /* Full viewport width */
    height: 100vh; /* Full viewport height */
}
```

### Responsive Images
```css
.responsive-image {
    max-width: 100%;
    height: auto;
}

/* Picture element for different image sources */
picture img {
    width: 100%;
    height: auto;
}
```

---

## CSS Animations and Transitions

### Transitions
```css
.button {
    background-color: blue;
    transition: all 0.3s ease;
}

.button:hover {
    background-color: red;
    transform: scale(1.1);
}
```

### Keyframe Animations
```css
@keyframes slideIn {
    from {
        transform: translateX(-100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}

.slide-in {
    animation: slideIn 1s ease-out;
}
```

### Animation Properties
```css
.animated-element {
    animation-name: slideIn;
    animation-duration: 1s;
    animation-timing-function: ease-out;
    animation-delay: 0s;
    animation-iteration-count: 1;
    animation-direction: normal;
    animation-fill-mode: none;
    
    /* Shorthand */
    animation: slideIn 1s ease-out 0s 1 normal none;
}
```

---

## CSS Best Practices

### 1. Organization
```css
/* Group related properties */
.element {
    /* Layout */
    display: flex;
    position: relative;
    
    /* Sizing */
    width: 100%;
    height: auto;
    
    /* Spacing */
    margin: 0;
    padding: 20px;
    
    /* Typography */
    font-size: 16px;
    line-height: 1.5;
    
    /* Colors */
    color: #333;
    background-color: #fff;
    
    /* Borders */
    border: 1px solid #ddd;
    border-radius: 4px;
}
```

### 2. Naming Conventions
```css
/* Use descriptive class names */
.user-profile-card { }
.navigation-menu { }
.primary-button { }

/* Avoid generic names */
.box { }
.text { }
.button { }
```

### 3. Specificity
```css
/* Avoid overly specific selectors */
body div.container ul li a { } /* Too specific */

/* Use classes instead */
.nav-link { } /* Better */
```

### 4. Performance
```css
/* Use efficient selectors */
.class-name { } /* Fast */
#id-name { } /* Fastest */
tag-name { } /* Slower */

/* Avoid universal selectors */
* { } /* Very slow */
```

---

## CSS Frameworks

### Popular CSS Frameworks
1. **Bootstrap** - Most popular, comprehensive
2. **Tailwind CSS** - Utility-first approach
3. **Foundation** - Professional grade
4. **Bulma** - Modern and clean
5. **Material-UI** - Google's Material Design

### Bootstrap Example
```html
<!DOCTYPE html>
<html>
<head>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body>
    <div class="container">
        <div class="row">
            <div class="col-md-6">
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title">Card title</h5>
                        <p class="card-text">Card content</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
```

---

## Practice Exercises

### Exercise 1: Basic Styling
Create a CSS file that styles:
- Headings with different colors and fonts
- Paragraphs with proper spacing
- Links with hover effects
- A simple navigation menu

### Exercise 2: Layout Challenge
Build a responsive layout using:
- Flexbox for navigation
- Grid for main content
- Media queries for mobile responsiveness

### Exercise 3: Component Library
Create reusable CSS components:
- Button styles (primary, secondary, danger)
- Card components
- Form inputs
- Modal overlays

### Exercise 4: Animation Portfolio
Build a portfolio page with:
- Smooth transitions
- Keyframe animations
- Hover effects
- Loading animations

---

## Next Steps

After mastering CSS, consider learning:

1. **Sass/SCSS** - CSS preprocessors
2. **CSS-in-JS** - Styling in JavaScript
3. **CSS Architecture** - BEM, SMACSS, ITCSS
4. **CSS Custom Properties** - CSS variables
5. **CSS Houdini** - Advanced CSS APIs

---

## Resources

- **MDN Web Docs**: Comprehensive CSS reference
- **CSS-Tricks**: Excellent CSS tutorials and examples
- **Codrops**: Creative CSS examples
- **CSS Grid Garden**: Interactive CSS Grid tutorial
- **Flexbox Froggy**: Interactive Flexbox tutorial

---

## Conclusion

CSS is a powerful tool for creating beautiful, responsive web designs. Start with the basics, practice regularly, and gradually explore advanced features. Remember that good CSS is about both aesthetics and maintainability.

Happy styling! 🎨
