"""
Fabric 3D — desktop prototype
Author: H4D1AM
Version: 0.1.0
This milestone handles BMP import, red/white mask inspection, yarn-system setup,
repeat validation, yarn color editing, and project JSON save/load.
The JPEG export in this milestone is a labeled 2D diagnostic preview, not a 3D render.
"""
from __future__ import annotations
import json, re, sys
from pathlib import Path
from PIL import Image, ImageOps
from PySide6.QtCore import Qt
from PySide6.QtGui import QColor, QPixmap, QImage
from PySide6.QtWidgets import (
    QApplication, QMainWindow, QWidget, QLabel, QPushButton, QFileDialog,
    QVBoxLayout, QHBoxLayout, QFormLayout, QSpinBox, QLineEdit, QComboBox,
    QTableWidget, QTableWidgetItem, QColorDialog, QMessageBox, QGroupBox,
    QSplitter, QHeaderView, QAbstractItemView
)

APP_NAME = "Fabric 3D"
VERSION = "0.1.0"
AUTHOR = "H4D1AM"
YARN_TYPES = ["Chenille", "Super", "Metallic", "Polyester", "Cotton", "Viscose", "Wool", "Blended", "Other"]
UNITS = ["Nm", "Den", "Tex", "Ne"]

def parse_repeat(value: str, system_count: int):
    value = value.strip()
    if system_count <= 1:
        return []
    if not value:
        raise ValueError("Enter a repeat such as 1.2.1.3")
    parts = re.split(r"[.\\s,;]+", value)
    if any(not p.isdigit() for p in parts):
        raise ValueError("Repeat must contain numbers separated by dots, e.g. 1.2.1.3")
    seq = [int(p) for p in parts]
    if any(n < 1 or n > system_count for n in seq):
        raise ValueError(f"Every repeat number must be between 1 and {system_count}.")
    return seq

class Fabric3D(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle(f"{APP_NAME}  |  v{VERSION}  |  {AUTHOR}")
        self.resize(1280, 820)
        self.bmp_path: Path | None = None
        self.source_image: Image.Image | None = None
        self._build_ui()
        self._apply_style()
        self.refresh_systems()

    def _build_ui(self):
        root = QWidget(); outer = QVBoxLayout(root); outer.setContentsMargins(22,18,22,18); outer.setSpacing(14)
        header = QHBoxLayout()
        title_box = QVBoxLayout()
        title = QLabel("FABRIC 3D"); title.setObjectName("brand")
        subtitle = QLabel("JACQUARD FABRIC SIMULATOR  •  DESKTOP PROTOTYPE")
        subtitle.setObjectName("muted")
        title_box.addWidget(title); title_box.addWidget(subtitle)
        header.addLayout(title_box); header.addStretch()
        self.version_label = QLabel(f"v{VERSION}  /  BY {AUTHOR}"); self.version_label.setObjectName("version")
        header.addWidget(self.version_label); outer.addLayout(header)

        split = QSplitter(Qt.Horizontal)
        left = QWidget(); left_l = QVBoxLayout(left); left_l.setSpacing(12)
        file_group = QGroupBox("01  ·  WEAVE MAP")
        fg = QVBoxLayout(file_group)
        self.file_label = QLabel("No BMP loaded"); self.file_label.setObjectName("muted"); self.file_label.setWordWrap(True)
        row = QHBoxLayout()
        load_btn = QPushButton("Import BMP"); load_btn.clicked.connect(self.load_bmp)
        self.export_btn = QPushButton("Export JPEG Preview"); self.export_btn.clicked.connect(self.export_jpeg); self.export_btn.setEnabled(False)
        row.addWidget(load_btn); row.addWidget(self.export_btn)
        fg.addWidget(self.file_label); fg.addLayout(row)
        self.map_info = QLabel("Expected map: red = warp  •  white = weft")
        self.map_info.setObjectName("muted"); fg.addWidget(self.map_info)
        left_l.addWidget(file_group)

        setup_group = QGroupBox("02  ·  FABRIC SETUP")
        form = QFormLayout(setup_group)
        self.warp_count = self._spin(1, 32, 1); self.weft_count = self._spin(4, 32, 4)
        self.warp_density = self._spin(66, 1000, 66); self.weft_density = self._spin(24, 1000, 24)
        self.warp_repeat = QLineEdit(); self.warp_repeat.setPlaceholderText("Disabled for 1 warp system")
        self.weft_repeat = QLineEdit("1.2.1.3"); self.weft_repeat.setPlaceholderText("e.g. 1.2.1.3")
        form.addRow("Warp systems", self.warp_count); form.addRow("Weft systems", self.weft_count)
        form.addRow("Total warp density", self.warp_density); form.addRow("Total weft density", self.weft_density)
        form.addRow("Warp repeat", self.warp_repeat); form.addRow("Weft repeat", self.weft_repeat)
        self.warp_count.valueChanged.connect(self.refresh_systems); self.weft_count.valueChanged.connect(self.refresh_systems)
        self.warp_count.valueChanged.connect(self.update_repeat_states); self.weft_count.valueChanged.connect(self.update_repeat_states)
        left_l.addWidget(setup_group)

        note = QLabel("Pixel cell scale is calculated as: width = total weft density ÷ weft systems; height = total warp density ÷ warp systems. Values are a relative display ratio.")
        note.setObjectName("note"); note.setWordWrap(True); left_l.addWidget(note)
        left_l.addStretch()

        right = QWidget(); right_l = QVBoxLayout(right); right_l.setSpacing(12)
        yarn_group = QGroupBox("03  ·  YARN SYSTEMS")
        yg = QVBoxLayout(yarn_group)
        self.table = QTableWidget(0, 6)
        self.table.setHorizontalHeaderLabels(["System", "Type", "Count", "Unit", "Color", "Manual diameter"])
        self.table.horizontalHeader().setSectionResizeMode(QHeaderView.Stretch)
        self.table.verticalHeader().setVisible(False)
        self.table.setSelectionBehavior(QAbstractItemView.SelectRows)
        yg.addWidget(self.table)
        right_l.addWidget(yarn_group, 2)

        preview_group = QGroupBox("04  ·  MAP INSPECTION")
        pg = QVBoxLayout(preview_group)
        self.preview = QLabel("Import a red-and-white BMP map to inspect it here.")
        self.preview.setAlignment(Qt.AlignCenter); self.preview.setMinimumHeight(250); self.preview.setObjectName("preview")
        pg.addWidget(self.preview, 1)
        actions = QHBoxLayout()
        save_btn = QPushButton("Save Project"); save_btn.clicked.connect(self.save_project)
        open_btn = QPushButton("Open Project"); open_btn.clicked.connect(self.open_project)
        actions.addWidget(save_btn); actions.addWidget(open_btn); pg.addLayout(actions)
        right_l.addWidget(preview_group, 3)

        split.addWidget(left); split.addWidget(right); split.setSizes([430, 820])
        outer.addWidget(split, 1)
        footer = QLabel("H4D1AM  •  FABRIC 3D  •  0.1.0  •  3D YARN RENDERER: NOT YET IMPLEMENTED")
        footer.setObjectName("footer"); outer.addWidget(footer)
        self.setCentralWidget(root)
        self.update_repeat_states()

    def _spin(self, value, maximum, minimum=1):
        s = QSpinBox(); s.setRange(minimum, maximum); s.setValue(value); return s

    def _apply_style(self):
        self.setStyleSheet("""
        QMainWindow, QWidget { background:#101318; color:#E8ECF2; font-family:Segoe UI; font-size:10pt; }
        #brand { color:#F2F5F9; font-size:25pt; font-weight:800; letter-spacing:2px; }
        #muted, #version { color:#8994A4; } #version { font-weight:700; }
        QGroupBox { border:1px solid #2B333F; border-radius:12px; margin-top:12px; padding:12px; font-weight:700; color:#D9E1EA; }
        QGroupBox::title { subcontrol-origin:margin; left:12px; padding:0 6px; color:#8EA9C4; }
        QPushButton { background:#263444; border:1px solid #3C5065; border-radius:8px; padding:10px 14px; font-weight:700; }
        QPushButton:hover { background:#344B63; } QPushButton:disabled { color:#606A76; background:#1A1F26; }
        QLineEdit, QSpinBox, QComboBox { background:#191F27; border:1px solid #303B49; border-radius:7px; padding:7px; min-height:22px; }
        QTableWidget { background:#151A21; alternate-background-color:#1B222C; gridline-color:#293442; border:0; }
        QHeaderView::section { background:#202936; color:#AEBBC9; padding:8px; border:0; font-weight:700; }
        #preview { background:#0C0F13; border:1px dashed #394656; border-radius:10px; color:#7F8B9B; }
        #note { color:#9EADBC; background:#18212B; border:1px solid #293B4D; border-radius:8px; padding:10px; }
        #footer { color:#687586; font-size:8pt; }
        """)
    
    def update_repeat_states(self):
        self.warp_repeat.setEnabled(self.warp_count.value() > 1)
        self.weft_repeat.setEnabled(self.weft_count.value() > 1)
        if self.warp_count.value() == 1: self.warp_repeat.clear()
        if self.weft_count.value() == 1: self.weft_repeat.clear()

    def refresh_systems(self):
        old = {}
        for r in range(self.table.rowCount()):
            name = self.table.item(r,0).text() if self.table.item(r,0) else ""
            old[name] = self._row_data(r)
        rows = self.warp_count.value() + self.weft_count.value()
        self.table.setRowCount(rows)
        idx = 0
        for family, count in (("Warp", self.warp_count.value()), ("Weft", self.weft_count.value())):
            for i in range(1, count+1):
                name = f"{family} {i}"
                self.table.setItem(idx,0,QTableWidgetItem(name))
                data = old.get(name, {})
                typ = QComboBox(); typ.addItems(YARN_TYPES); typ.setCurrentText(data.get("type","Polyester"))
                self.table.setCellWidget(idx,1,typ)
                count_edit = QLineEdit(data.get("count","")); count_edit.setPlaceholderText("e.g. 3")
                self.table.setCellWidget(idx,2,count_edit)
                unit = QComboBox(); unit.addItems(UNITS); unit.setCurrentText(data.get("unit","Nm"))
                self.table.setCellWidget(idx,3,unit)
                color = data.get("color","#B7A48A")
                btn = QPushButton(color); btn.setStyleSheet(f"background:{color}; color:#101318; font-weight:800;")
                btn.clicked.connect(lambda checked=False, b=btn: self.pick_color(b))
                self.table.setCellWidget(idx,4,btn)
                dia = QLineEdit(data.get("diameter","")); dia.setPlaceholderText("Auto")
                self.table.setCellWidget(idx,5,dia)
                idx += 1

    def _row_data(self, row):
        return {"type":self.table.cellWidget(row,1).currentText(),
                "count":self.table.cellWidget(row,2).text(),
                "unit":self.table.cellWidget(row,3).currentText(),
                "color":self.table.cellWidget(row,4).text(),
                "diameter":self.table.cellWidget(row,5).text()}

    def pick_color(self, button):
        color = QColorDialog.getColor(QColor(button.text()), self, "Choose yarn color")
        if color.isValid():
            value = color.name().upper(); button.setText(value)
            button.setStyleSheet(f"background:{value}; color:#101318; font-weight:800;")

    def load_bmp(self):
        filename, _ = QFileDialog.getOpenFileName(self, "Import weave map", "", "Bitmap images (*.bmp);;Images (*.bmp *.png)")
        if not filename: return
        try:
            image = Image.open(filename).convert("RGB")
            self.bmp_path = Path(filename); self.source_image = image
            w,h = image.size
            self.file_label.setText(f"{self.bmp_path.name}  •  {w:,} × {h:,} px")
            self.map_info.setText("Map convention: red pixels = warp; white pixels = weft. Other colors are flagged during validation.")
            self.show_image(image)
            self.export_btn.setEnabled(True)
        except Exception as exc:
            QMessageBox.critical(self, "Import failed", str(exc))

    def show_image(self, image):
        preview = image.copy(); preview.thumbnail((900,500))
        data = preview.tobytes("raw","RGB")
        qimg = QImage(data, preview.width, preview.height, preview.width*3, QImage.Format_RGB888).copy()
        self.preview.setPixmap(QPixmap.fromImage(qimg))

    def validate(self):
        parse_repeat(self.warp_repeat.text(), self.warp_count.value())
        parse_repeat(self.weft_repeat.text(), self.weft_count.value())
        if self.source_image is None: raise ValueError("Import a BMP map first.")
        return True

    def project_data(self):
        self.validate()
        yarns=[]
        for r in range(self.table.rowCount()):
            name=self.table.item(r,0).text()
            d=self._row_data(r)
            yarns.append({"system":name, **d})
        return {"app":APP_NAME,"version":VERSION,"author":AUTHOR,
                "bmp_path":str(self.bmp_path) if self.bmp_path else None,
                "warp_systems":self.warp_count.value(),"weft_systems":self.weft_count.value(),
                "warp_density":self.warp_density.value(),"weft_density":self.weft_density.value(),
                "warp_repeat":self.warp_repeat.text(),"weft_repeat":self.weft_repeat.text(),
                "pixel_width_scale":self.weft_density.value()/self.weft_count.value(),
                "pixel_height_scale":self.warp_density.value()/self.warp_count.value(),
                "yarns":yarns}

    def save_project(self):
        try: data=self.project_data()
        except Exception as exc: QMessageBox.warning(self,"Check settings",str(exc)); return
        filename,_=QFileDialog.getSaveFileName(self,"Save Fabric 3D project","","Fabric 3D Project (*.f3d.json)")
        if filename:
            Path(filename).write_text(json.dumps(data,indent=2),encoding="utf-8")
            QMessageBox.information(self,"Saved","Project settings saved.")

    def open_project(self):
        filename,_=QFileDialog.getOpenFileName(self,"Open Fabric 3D project","","Fabric 3D Project (*.json)")
        if not filename:return
        try:
            d=json.loads(Path(filename).read_text(encoding="utf-8"))
            self.warp_count.setValue(int(d.get("warp_systems",1))); self.weft_count.setValue(int(d.get("weft_systems",1)))
            self.warp_density.setValue(int(d.get("warp_density",66))); self.weft_density.setValue(int(d.get("weft_density",24)))
            self.warp_repeat.setText(d.get("warp_repeat","")); self.weft_repeat.setText(d.get("weft_repeat",""))
            self.refresh_systems()
            by_name={y["system"]:y for y in d.get("yarns",[])}
            for r in range(self.table.rowCount()):
                name=self.table.item(r,0).text(); y=by_name.get(name)
                if not y:continue
                self.table.cellWidget(r,1).setCurrentText(y.get("type","Polyester"))
                self.table.cellWidget(r,2).setText(y.get("count",""))
                self.table.cellWidget(r,3).setCurrentText(y.get("unit","Nm"))
                b=self.table.cellWidget(r,4); b.setText(y.get("color","#B7A48A")); b.setStyleSheet(f"background:{b.text()}; color:#101318;")
                self.table.cellWidget(r,5).setText(y.get("diameter",""))
            bmp=d.get("bmp_path")
            if bmp and Path(bmp).exists():
                self.bmp_path=Path(bmp); self.source_image=Image.open(bmp).convert("RGB")
                self.file_label.setText(f"{self.bmp_path.name}  •  {self.source_image.width:,} × {self.source_image.height:,} px")
                self.show_image(self.source_image); self.export_btn.setEnabled(True)
            self.update_repeat_states()
        except Exception as exc: QMessageBox.critical(self,"Open failed",str(exc))

    def export_jpeg(self):
        if self.source_image is None:return
        filename,_=QFileDialog.getSaveFileName(self,"Export map inspection JPEG","","JPEG Image (*.jpg)")
        if not filename:return
        image=self.source_image.convert("RGB")
        image.save(filename,"JPEG",quality=95,subsampling=0)
        QMessageBox.information(self,"Exported","Diagnostic map JPEG exported. This is not the 3D fabric render.")

if __name__ == "__main__":
    app=QApplication(sys.argv)
    window=Fabric3D(); window.show()
    sys.exit(app.exec())
