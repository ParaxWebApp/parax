# Para SDK 🛡️

[English](#english) | [Türkçe](#türkçe)

---

## English

Lightweight error tracking, breadcrumb recording, and performance monitoring SDK for web applications backed by Firebase Firestore.

### Features
- **Zero-config error capture**: Automatically catches `window.onerror`, unhandled promise rejections, and `console.error`.
- **Breadcrumbs & User Actions**: Tracks clicks, navigation changes, and failed HTTP requests leading up to an error.
- **Firestore Integration**: Directly logs structured errors into your Firestore `errors` collection.

### Installation & Usage

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

---

## Türkçe

Firebase Firestore altyapısını kullanan, web uygulamaları için hafif hata takibi, kullanıcı eylemleri (breadcrumbs) ve performans izleme SDK'sı.

### Özellikler
- **Sıfır Ayarlı Hata Yakalama**: `window.onerror`, işlenmemiş promise reddetmeleri ve `console.error` çağrılarını otomatik olarak yakalar.
- **Kullanıcı Eylemleri ve Breadcrumb**: Hata oluşmadan önceki tıklamaları, sayfa geçişlerini ve başarısız HTTP isteklerini kaydeder.
- **Firestore Entegrasyonu**: Yapılandırılmış hataları doğrudan Firestore `errors` koleksiyonunuza kaydeder.

### Kurulum ve Kullanım

`para.js` ve isteğe bağlı olarak `para-addon.js` dosyalarını HTML dosyanıza ekleyin:

```html
<script src="https://www.gstatic.com/firebasejs/11.0.1/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/11.0.1/firebase-auth-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore-compat.js"></script>

<script src="para.js"></script>
<script src="para-addon.js"></script>
```

Firebase hazır olduğunda Para otomatik olarak başlatılır. Ayrıca kodunuzun herhangi bir yerinde manuel olarak hata yakalayabilirsiniz:
```javascript
if (typeof Para !== "undefined") {
  Para.capture(new Error("Bir şeyler ters gitti!"), { type: "custom" });
}
```
