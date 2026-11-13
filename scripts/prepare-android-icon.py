#!/usr/bin/env python3
"""Install the Fabric Analyzer intro mark as native Android launcher icons."""
from pathlib import Path
import re
import sys

project = Path(sys.argv[1]).resolve()
res = project / "app" / "src" / "main" / "res"
manifest = project / "app" / "src" / "main" / "AndroidManifest.xml"

foreground = """<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp" android:height="108dp"
    android:viewportWidth="512" android:viewportHeight="512">
    <group android:rotation="-8" android:pivotX="256" android:pivotY="256">
        <path android:pathData="M76,150 V362 M148,150 V362 M220,150 V362 M292,150 V362 M364,150 V362 M436,150 V362 M76,150 H436 M76,192 H436 M76,234 H436 M76,276 H436 M76,318 H436 M76,362 H436"
            android:strokeColor="#D8AD68" android:strokeWidth="9"
            android:strokeLineCap="round" android:fillColor="#00000000"/>
    </group>
    <path android:pathData="M256,229 A27,27 0,1 0,256,283 A27,27 0,1 0,256,229"
        android:strokeColor="#F1D19B" android:strokeWidth="5"
        android:fillColor="#00000000"/>
    <path android:pathData="M256,243 A13,13 0,1 0,256,269 A13,13 0,1 0,256,243"
        android:strokeColor="#F1D19B" android:strokeWidth="4"
        android:fillColor="#00000000"/>
    <path android:pathData="M256,207 A49,49 0,1 0,256,305 A49,49 0,1 0,256,207"
        android:strokeColor="#D8AD68" android:strokeAlpha="0.4"
        android:strokeWidth="2" android:fillColor="#00000000"/>
</vector>
"""

legacy = foreground.replace(
    '<vector xmlns:android="http://schemas.android.com/apk/res/android"',
    '<vector xmlns:android="http://schemas.android.com/apk/res/android"',
    1
).replace(
    '    <group android:rotation="-8"',
    '    <path android:pathData="M0,0 H512 V512 H0 Z" android:fillColor="#10141D"/>\n    <group android:rotation="-8"',
    1
)

(res / "drawable").mkdir(parents=True, exist_ok=True)
(res / "mipmap-anydpi-v26").mkdir(parents=True, exist_ok=True)
(res / "mipmap").mkdir(parents=True, exist_ok=True)
(res / "values").mkdir(parents=True, exist_ok=True)

(res / "drawable" / "ic_launcher_foreground.xml").write_text(foreground, encoding="utf-8")
(res / "mipmap" / "ic_launcher.xml").write_text(legacy, encoding="utf-8")
(res / "mipmap" / "ic_launcher_round.xml").write_text(legacy, encoding="utf-8")
adaptive = """<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@drawable/ic_launcher_foreground"/>
</adaptive-icon>
"""
(res / "mipmap-anydpi-v26" / "ic_launcher.xml").write_text(adaptive, encoding="utf-8")
(res / "mipmap-anydpi-v26" / "ic_launcher_round.xml").write_text(adaptive, encoding="utf-8")
(res / "values" / "ic_launcher_colors.xml").write_text(
    '<resources><color name="ic_launcher_background">#10141D</color></resources>\n',
    encoding="utf-8"
)

if manifest.exists():
    xml = manifest.read_text(encoding="utf-8")
    if re.search(r'android:icon="[^"]+"', xml):
        xml = re.sub(r'android:icon="[^"]+"', 'android:icon="@mipmap/ic_launcher"', xml, count=1)
    else:
        xml = re.sub(r'(<application\b)', r'\1 android:icon="@mipmap/ic_launcher"', xml, count=1)
    if re.search(r'android:roundIcon="[^"]+"', xml):
        xml = re.sub(r'android:roundIcon="[^"]+"', 'android:roundIcon="@mipmap/ic_launcher_round"', xml, count=1)
    else:
        xml = re.sub(r'(<application\b)', r'\1 android:roundIcon="@mipmap/ic_launcher_round"', xml, count=1)
    manifest.write_text(xml, encoding="utf-8")

print("Installed Fabric Analyzer navy-and-gold intro icon resources.")
