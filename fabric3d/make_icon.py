from PIL import Image, ImageDraw, ImageFilter
S=512
im=Image.new("RGBA",(S,S),(7,9,13,255));d=ImageDraw.Draw(im)
d.rounded_rectangle((12,12,500,500),radius=112,fill=(13,17,25),outline=(65,73,88),width=5)
glow=Image.new("RGBA",(S,S),(0,0,0,0));gd=ImageDraw.Draw(glow);gd.ellipse((92,76,420,440),fill=(190,20,42,55));glow=glow.filter(ImageFilter.GaussianBlur(35));im=Image.alpha_composite(im,glow);d=ImageDraw.Draw(im)
d.polygon([(190,112),(322,112),(390,398),(122,398)],fill=(151,24,39),outline=(255,106,117),width=5)
for y in range(142,385,17):
 d.arc((155,y-8,357,y+20),0,180,fill=(255,104,116),width=8);d.arc((155,y,357,y+25),180,360,fill=(88,8,22),width=5)
d.line((142,326,345,168),fill=(248,249,251),width=15);d.line((148,338,351,180),fill=(170,177,190),width=4)
d.ellipse((176,96,336,143),fill=(220,224,231),outline=(255,255,255),width=5);d.ellipse((191,108,321,134),fill=(35,40,50),outline=(120,128,140),width=3)
d.ellipse((104,377,408,433),fill=(72,79,91),outline=(224,228,235),width=6);d.ellipse((135,386,377,419),fill=(19,23,31),outline=(117,126,140),width=3)
d.line((115,250,160,250),fill=(255,255,255),width=8);d.line((352,250,397,250),fill=(255,255,255),width=8)
im.save("fabric3d_icon.png");im.save("fabric3d_icon.ico",sizes=[(256,256),(128,128),(64,64),(48,48),(32,32),(16,16)])
