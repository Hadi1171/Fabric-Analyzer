from __future__ import annotations
import json, re, sys
from pathlib import Path
from PIL import Image
from PySide6.QtCore import Qt, QTimer
from PySide6.QtGui import QColor, QPixmap, QImage
from PySide6.QtWidgets import *

APP="Fabric 3D"; VERSION="0.3.0"; AUTHOR="H4D1AM"
RED="#E32636"; WHITE="#F5F6F8"; BG="#090B10"; PANEL="#121722"; LINE="#293241"
TYPES=["انتخاب نخ","شانل","سوپر","سوپر شانل","نخ سیم","پلی‌استر","پنبه","ویسکوز","پشم","ترکیبی","سایر"]
UNITS=["Nm","Den","Tex","Ne"]

def repeat_values(s,n):
    if n<=1:return []
    parts=[x for x in re.split(r"[.\s,;]+",s.strip()) if x]
    if not parts or any(not x.isdigit() for x in parts): raise ValueError("Use a repeat such as 1.2.1.3")
    vals=[int(x) for x in parts]
    if any(x<1 or x>n for x in vals): raise ValueError(f"Repeat values must be between 1 and {n}.")
    return vals

class Main(QMainWindow):
    def __init__(self):
        super().__init__(); self.setWindowTitle(f"{APP}  |  {VERSION}"); self.resize(1180,790)
        self.data={"warp":[],"weft":[]}; self.bmp=None; self.image=None
        self.stack=QStackedWidget(); self.setCentralWidget(self.stack)
        self.pages=[]
        self.build_intro(); self.build_welcome(); self.build_wizard()
        self.setStyleSheet(self.styles())
        self.stack.setCurrentIndex(0)
        QTimer.singleShot(1700,lambda:self.stack.setCurrentIndex(1))

    def styles(self):
        return f"""
        QWidget{{background:{BG};color:{WHITE};font-family:'Segoe UI';font-size:10pt}}
        QLabel#hero{{font-size:34pt;font-weight:900;letter-spacing:3px}}
        QLabel#sub{{color:#A3ADBA;letter-spacing:2px}}
        QLabel#muted{{color:#8994A4}}
        QFrame#panel,QGroupBox{{background:{PANEL};border:1px solid {LINE};border-radius:14px}}
        QGroupBox{{margin-top:14px;padding:14px;font-weight:700}}
        QGroupBox::title{{subcontrol-origin:margin;left:14px;padding:0 6px;color:#E7A0A7}}
        QPushButton{{background:#202938;border:1px solid #394659;border-radius:9px;padding:11px 18px;font-weight:700}}
        QPushButton:hover{{background:#303D50;border-color:#68788E}}
        QPushButton#primary{{background:{RED};border:1px solid #FF5361;color:white}}
        QPushButton#primary:hover{{background:#F13B4B}}
        QLineEdit,QSpinBox,QComboBox{{background:#0D121B;border:1px solid #303B4B;border-radius:8px;padding:9px;min-height:22px;selection-background-color:{RED}}}
        QTableWidget{{background:#0E131C;gridline-color:#293241;border:0;alternate-background-color:#151C28}}
        QHeaderView::section{{background:#202938;color:#C7D0DB;padding:10px;border:0;font-weight:700}}
        QProgressBar{{background:#202938;border:0;border-radius:4px;height:6px;text-align:center}}
        QProgressBar::chunk{{background:{RED};border-radius:4px}}
        """
    def page(self):
        w=QWidget(); l=QVBoxLayout(w); l.setContentsMargins(42,30,42,26); l.setSpacing(18); self.stack.addWidget(w); self.pages.append(w); return l
    def heading(self,title,desc):
        t=QLabel(title);t.setStyleSheet("font-size:23pt;font-weight:800")
        d=QLabel(desc);d.setObjectName("muted");d.setWordWrap(True);return t,d
    def button(self,text,fn,primary=False):
        b=QPushButton(text);b.clicked.connect(fn)
        if primary:b.setObjectName("primary")
        return b
    def brand(self,layout):
        r=QHBoxLayout(); name=QLabel("FABRIC 3D");name.setStyleSheet(f"font-size:13pt;font-weight:900;letter-spacing:2px;color:{WHITE}")
        r.addWidget(name);r.addStretch();v=QLabel("v"+VERSION+"  •  H4D1AM");v.setObjectName("muted");r.addWidget(v);layout.addLayout(r)
    def build_intro(self):
        l=self.page();l.addStretch()
        logo=QLabel("✳");logo.setAlignment(Qt.AlignCenter);logo.setStyleSheet(f"font-size:74pt;color:{RED}")
        h=QLabel("FABRIC 3D");h.setObjectName("hero");h.setAlignment(Qt.AlignCenter)
        s=QLabel("A 3D JACQUARD FABRIC SIMULATOR");s.setObjectName("sub");s.setAlignment(Qt.AlignCenter)
        bar=QProgressBar();bar.setRange(0,0);bar.setFixedWidth(260);bar.setTextVisible(False)
        l.addWidget(logo);l.addWidget(h);l.addWidget(s,alignment=Qt.AlignCenter);l.addSpacing(24);l.addWidget(bar,alignment=Qt.AlignCenter)
        l.addWidget(QLabel("DESIGNED BY H4D1AM  •  "+VERSION),alignment=Qt.AlignCenter);l.addStretch()
    def build_welcome(self):
        l=self.page();self.brand(l);l.addStretch()
        row=QHBoxLayout();left=QVBoxLayout()
        h,d=self.heading("Bring your weave to life.","Build a fabric project from your BMP weave map, define yarn systems, and prepare it for 3D rendering.")
        left.addWidget(h);left.addWidget(d);left.addSpacing(18)
        left.addWidget(self.button("NEW FABRIC PROJECT   →",lambda:self.go(0),True),alignment=Qt.AlignLeft)
        left.addWidget(QLabel("Import • Configure • Create"),alignment=Qt.AlignLeft)
        row.addLayout(left,3)
        art=QLabel("╱╲\n╳\n╲╱");art.setAlignment(Qt.AlignCenter);art.setStyleSheet(f"font-size:58pt;font-weight:900;color:{RED};background:#151B26;border:1px solid {LINE};border-radius:24px;")
        row.addWidget(art,2);l.addLayout(row);l.addStretch()
        foot=QLabel("FABRIC 3D  /  H4D1AM");foot.setObjectName("muted");l.addWidget(foot)
    def build_wizard(self):
        self.wiz=QWidget(); outer=QVBoxLayout(self.wiz);outer.setContentsMargins(34,24,34,24)
        self.brand(outer)
        self.progress=QProgressBar();self.progress.setRange(0,6);self.progress.setValue(0);self.progress.setTextVisible(False);outer.addWidget(self.progress)
        self.stepstack=QStackedWidget();outer.addWidget(self.stepstack,1)
        self.step_titles=["Load BMP File","Warp & Weft Count","Density Settings","Pattern & Rhythm","Warp Yarn Properties","Weft Yarn Properties"]
        for i in range(6):
            p=QWidget();pl=QVBoxLayout(p);pl.setContentsMargins(8,14,8,8)
            h,d=self.heading(f"0{i+1}  /  {self.step_titles[i]}",self.step_desc(i));pl.addWidget(h);pl.addWidget(d)
            body=QWidget();bodyl=QVBoxLayout(body);bodyl.setContentsMargins(0,12,0,12)
            if i==0:self.make_bmp(bodyl)
            elif i==1:self.make_counts(bodyl)
            elif i==2:self.make_density(bodyl)
            elif i==3:self.make_rhythm(bodyl)
            elif i==4:self.make_yarns(bodyl,"warp")
            elif i==5:self.make_yarns(bodyl,"weft")
            pl.addWidget(body,1)
            nav=QHBoxLayout();nav.addWidget(self.button("← Back",lambda ix=i:self.back(ix)))
            nav.addStretch()
            if i<5:nav.addWidget(self.button("Next  →",lambda ix=i:self.next(ix),True))
            else:nav.addWidget(self.button("CREATE FABRIC  →",self.create_fabric,True))
            pl.addLayout(nav);self.stepstack.addWidget(p)
        self.stack.addWidget(self.wiz)
    def step_desc(self,i):
        return ["Choose the red-and-white BMP weave map. Red pixels represent warp and white pixels represent weft.","Set how many independent warp and weft yarn systems your fabric uses.","Enter the total warp and weft densities for the complete fabric.","Define the repeating order of yarn systems in warp and weft directions.","Configure each warp system separately: yarn type, count, unit, and color.","Configure each weft system separately: yarn type, count, unit, and color."][i]
    def make_bmp(self,l):
        box=QFrame();box.setObjectName("panel");bl=QVBoxLayout(box)
        self.filelabel=QLabel("No weave map selected");self.filelabel.setAlignment(Qt.AlignCenter);self.filelabel.setMinimumHeight(150);self.filelabel.setObjectName("muted")
        bl.addWidget(self.filelabel);bl.addWidget(self.button("SELECT BMP FILE",self.load_bmp,True),alignment=Qt.AlignCenter);l.addWidget(box);l.addStretch()
    def make_counts(self,l):
        f=QFormLayout();self.wc=QSpinBox();self.wc.setRange(1,64);self.wc.setValue(1);self.fc=QSpinBox();self.fc.setRange(1,64);self.fc.setValue(4)
        f.addRow("Warp systems",self.wc);f.addRow("Weft systems",self.fc);l.addLayout(f);l.addStretch()
    def make_density(self,l):
        f=QFormLayout();self.wd=QSpinBox();self.wd.setRange(1,5000);self.wd.setValue(1);self.fd=QSpinBox();self.fd.setRange(1,5000);self.fd.setValue(1)
        f.addRow("Total warp density",self.wd);f.addRow("Total weft density",self.fd);l.addLayout(f)
        self.scaleinfo=QLabel("Cell scale is calculated from density ÷ systems.");self.scaleinfo.setObjectName("muted");l.addWidget(self.scaleinfo);self.wd.valueChanged.connect(self.update_scale);self.fd.valueChanged.connect(self.update_scale);self.wc.valueChanged.connect(self.update_scale);self.fc.valueChanged.connect(self.update_scale);l.addStretch()
    def update_scale(self):
        self.scaleinfo.setText(f"Horizontal / width: {self.fd.value()/self.fc.value():g}   •   Vertical / height: {self.wd.value()/self.wc.value():g}")
    def make_rhythm(self,l):
        f=QFormLayout();self.wr=QLineEdit();self.wr.setPlaceholderText("e.g. 1.2.1.3");self.fr=QLineEdit("1.2.1.3");self.fr.setPlaceholderText("e.g. 1.2.1.3")
        f.addRow("Warp rhythm",self.wr);f.addRow("Weft rhythm",self.fr);l.addLayout(f)
        note=QLabel("Use system numbers separated by dots. A rhythm may repeat some systems and omit others. Rhythm is disabled for a single-system direction.");note.setObjectName("muted");note.setWordWrap(True);l.addWidget(note);l.addStretch()
    def make_yarns(self,l,family):
        table=QTableWidget(0,5);table.setHorizontalHeaderLabels(["System","Yarn type","Count","Unit","Color"]);table.horizontalHeader().setSectionResizeMode(QHeaderView.Stretch);table.verticalHeader().hide()
        setattr(self,f"{family}table",table);l.addWidget(table)
    def load_bmp(self):
        path,_=QFileDialog.getOpenFileName(self,"Select weave map","","Bitmap (*.bmp)")
        if not path:return
        try:
            im=Image.open(path).convert("RGB");self.bmp=path;self.image=im
            self.filelabel.setText(f"✓  {Path(path).name}\n{im.width:,} × {im.height:,} px\nRed = Warp   •   White = Weft")
        except Exception as e:QMessageBox.critical(self,"BMP error",str(e))
    def fill_yarn_table(self,family):
        table=getattr(self,f"{family}table");n=self.wc.value() if family=="warp" else self.fc.value()
        old=self.data.get(family,[]);table.setRowCount(n)
        for i in range(n):
            table.setItem(i,0,QTableWidgetItem(f"{family.title()} {i+1}"))
            typ=QComboBox();typ.addItems(TYPES);typ.setCurrentIndex(0);cnt=QLineEdit(old[i]["count"] if i<len(old) else "");cnt.setPlaceholderText("e.g. 3")
            unit=QComboBox();unit.addItems(UNITS);col=QPushButton(old[i]["color"] if i<len(old) else ("#D92D3A" if family=="warp" else "#F0F0F0"))
            col.setStyleSheet(f"background:{col.text()};color:#111;font-weight:800")
            col.clicked.connect(lambda _,b=col:self.choose_color(b))
            table.setCellWidget(i,1,typ);table.setCellWidget(i,2,cnt);table.setCellWidget(i,3,unit);table.setCellWidget(i,4,col)
    def choose_color(self,b):
        c=QColorDialog.getColor(QColor(b.text()),self,"Choose yarn color")
        if c.isValid():b.setText(c.name().upper());b.setStyleSheet(f"background:{b.text()};color:#111;font-weight:800")
    def read_yarns(self,fam):
        t=getattr(self,f"{fam}table");out=[]
        for i in range(t.rowCount()):
            out.append({"type":t.cellWidget(i,1).currentText(),"count":t.cellWidget(i,2).text(),"unit":t.cellWidget(i,3).currentText(),"color":t.cellWidget(i,4).text()})
        return out
    def go(self,i):
        self.stack.setCurrentWidget(self.wiz);self.stepstack.setCurrentIndex(i);self.progress.setValue(i+1)
        if i==4:self.fill_yarn_table("warp")
        if i==5:self.data["warp"]=self.read_yarns("warp");self.fill_yarn_table("weft")
        if i==2:self.update_scale()
    def back(self,i):
        if i==0:self.stack.setCurrentIndex(1)
        else:self.go(i-1)
    def next(self,i):
        try:
            if i==0 and self.image is None:raise ValueError("Select a BMP file first.")
            if i==3:
                repeat_values(self.wr.text(),self.wc.value());repeat_values(self.fr.text(),self.fc.value())
            self.go(i+1)
        except Exception as e:QMessageBox.warning(self,"Check this step",str(e))
    def create_fabric(self):
        self.data["weft"]=self.read_yarns("weft")
        result=QDialog(self);result.setWindowTitle("Fabric 3D — Project Ready");result.resize(650,420)
        lay=QVBoxLayout(result);title=QLabel("PROJECT CONFIGURATION COMPLETE");title.setStyleSheet(f"font-size:20pt;font-weight:900;color:{RED}")
        lay.addWidget(title);lay.addWidget(QLabel("Your weave map and yarn setup are ready for the 3D rendering stage."))
        preview=QLabel();preview.setAlignment(Qt.AlignCenter)
        if self.image:
            im=self.image.copy();im.thumbnail((560,230));raw=im.tobytes("raw","RGB");q=QImage(raw,im.width,im.height,im.width*3,QImage.Format_RGB888).copy();preview.setPixmap(QPixmap.fromImage(q))
        lay.addWidget(preview)
        lay.addWidget(QLabel("Note: the true yarn-interlacing renderer is the next milestone; this screen confirms project inputs and does not claim a finished 3D render."))
        buttons=QHBoxLayout();save=QPushButton("SAVE PROJECT");save.clicked.connect(self.save_project);buttons.addWidget(save);close=QPushButton("CLOSE");close.clicked.connect(result.accept);buttons.addWidget(close);lay.addLayout(buttons);result.exec()
    def save_project(self):
        path,_=QFileDialog.getSaveFileName(self,"Save Fabric 3D Project","","Fabric 3D Project (*.f3d.json)")
        if not path:return
        payload={"version":VERSION,"bmp":self.bmp,"warp_systems":self.wc.value(),"weft_systems":self.fc.value(),"warp_density":self.wd.value(),"weft_density":self.fd.value(),"warp_rhythm":self.wr.text(),"weft_rhythm":self.fr.text(),"warp_yarns":self.data.get("warp",[]),"weft_yarns":self.data.get("weft",[])}
        Path(path).write_text(json.dumps(payload,indent=2),encoding="utf-8")
        QMessageBox.information(self,"Saved","Project file saved.")
if __name__=="__main__":
    app=QApplication(sys.argv);w=Main();w.show();sys.exit(app.exec())
