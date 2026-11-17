const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const manifestPath = path.join(root, "android", "app", "src", "main", "AndroidManifest.xml");
const gradlePath = path.join(root, "android", "app", "build.gradle");

if (!fs.existsSync(manifestPath) || !fs.existsSync(gradlePath)) {
  throw new Error("Capacitor Android project was not generated.");
}

let manifest = fs.readFileSync(manifestPath, "utf8");
// No device permissions are needed by this offline calculator.
manifest = manifest.replace(/^\s*<uses-permission[^>]*\/>\s*\r?\n/gm, "");
manifest = manifest.replace(/<application\b([^>]*)>/, (match, attrs) => {
  let next = attrs
    .replace(/\sandroid:allowBackup="[^"]*"/g, "")
    .replace(/\sandroid:usesCleartextTraffic="[^"]*"/g, "");
  next += ' android:allowBackup="false" android:usesCleartextTraffic="false"';
  return "<application" + next + ">";
});
fs.writeFileSync(manifestPath, manifest, "utf8");

let gradle = fs.readFileSync(gradlePath, "utf8");
if (/buildTypes\s*\{/.test(gradle)) {
  if (!/debug\s*\{[^}]*debuggable\s+false/s.test(gradle)) {
    gradle = gradle.replace(/buildTypes\s*\{/, 'buildTypes {\n        debug { debuggable false }');
  }
} else {
  throw new Error("Could not locate Android buildTypes block.");
}
fs.writeFileSync(gradlePath, gradle, "utf8");

// Fail closed if a future plugin reintroduces network/device permissions.
if (/<uses-permission\b/i.test(manifest)) {
  throw new Error("Unexpected Android permissions found in manifest.");
}
if (/android:usesCleartextTraffic="true"/.test(manifest)) {
  throw new Error("Cleartext traffic must remain disabled.");
}

const javaDir = path.join(root, "android", "app", "src", "main", "java", "com", "hadi1171", "gramweave");
fs.mkdirSync(javaDir, { recursive: true });
const bridgeJava = `package com.hadi1171.gramweave;

import android.content.ContentValues;
import android.content.Context;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import org.json.JSONObject;
import java.io.OutputStream;

public final class GramWeaveExportBridge {
  private final Context context;
  GramWeaveExportBridge(Context context) { this.context = context.getApplicationContext(); }

  @JavascriptInterface
  public String saveReport(String encoded, String requestedName) {
    try {
      if (Build.VERSION.SDK_INT < 29) return new JSONObject().put("ok", false).put("error", "ذخیره مستقیم در گالری به Android 10 یا جدیدتر نیاز دارد.").toString();
      if (encoded == null || encoded.length() > 24000000) throw new IllegalArgumentException("حجم گزارش نامعتبر است.");
      String name = requestedName == null ? "Gram-Weave-Report.jpg" : requestedName.replaceAll("[^A-Za-z0-9._-]", "-");
      if (!name.toLowerCase().endsWith(".jpg")) name += ".jpg";
      byte[] bytes = Base64.decode(encoded, Base64.DEFAULT);
      ContentValues values = new ContentValues();
      values.put(MediaStore.Images.Media.DISPLAY_NAME, name);
      values.put(MediaStore.Images.Media.MIME_TYPE, "image/jpeg");
      values.put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/Gram Weave");
      values.put(MediaStore.Images.Media.IS_PENDING, 1);
      Uri uri = context.getContentResolver().insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values);
      if (uri == null) throw new IllegalStateException("ساخت فایل در گالری ناموفق بود.");
      try (OutputStream out = context.getContentResolver().openOutputStream(uri)) {
        if (out == null) throw new IllegalStateException("امکان نوشتن فایل وجود ندارد.");
        out.write(bytes);
      }
      ContentValues ready = new ContentValues();
      ready.put(MediaStore.Images.Media.IS_PENDING, 0);
      context.getContentResolver().update(uri, ready, null, null);
      return new JSONObject().put("ok", true).put("uri", uri.toString()).toString();
    } catch (Exception error) {
      try { return new JSONObject().put("ok", false).put("error", error.getMessage() == null ? "خطای ذخیره فایل" : error.getMessage()).toString(); }
      catch (Exception ignored) { return "{\\"ok\\":false}"; }
    }
  }
}
`;
fs.writeFileSync(path.join(javaDir, "GramWeaveExportBridge.java"), bridgeJava, "utf8");
const mainActivity = `package com.hadi1171.gramweave;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    getBridge().getWebView().addJavascriptInterface(new GramWeaveExportBridge(this), "GramWeaveNative");
  }
}
`;
fs.writeFileSync(path.join(javaDir, "MainActivity.java"), mainActivity, "utf8");

console.log("Android hardening applied: no permissions, no cleartext traffic, backup off, WebView debugging off.");
