# Para SDK 🛡️

Lightweight error tracking, breadcrumb recording, and performance monitoring SDK for web applications backed by Firebase Firestore.

## Features
- **Zero-config error capture**: Automatically catches `window.onerror`, unhandled promise rejections, and `console.error`.
- **Breadcrumbs & User Actions**: Tracks clicks, navigation changes, and failed HTTP requests leading up to an error.
- **Firestore Integration**: Directly logs structured errors into your Firestore `errors` collection.

## Installation & Usage

Include `para.js` and optionally `para-addon.js` in your HTML:

```html
<script src="https://www.gstatic.com/firebasejs/11.0.1/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/11.0.1/firebase-auth-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore-compat.js"></script>

<script src="para.js"></script>
<script src="para-addon.js"></script>
```

Para initializes automatically once Firebase is ready. You can also manually capture errors anywhere in your code:
```javascript
if (typeof Para !== "undefined") {
  Para.capture(new Error("Something went wrong!"), { type: "custom" });
}
```
