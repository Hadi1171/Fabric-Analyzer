from PIL import Image, ImageDraw
S=512
im=Image.new("RGBA",(S,S),(9,11,16,255));d=ImageDraw.Draw(im)
d.rounded_rectangle((18,18,494,494),radius=104,fill=(16,21,31),outline=(58,68,84),width=8)
for i in range(5):
 x=112+i*58;d.rounded_rectangle((x,105,x+38,408),radius=18,fill=(218,37,54),outline=(255,110,120),width=3)
for i in range(5):
 y=126+i*58;d.rounded_rectangle((102,y,410,y+38),radius=18,fill=(239,241,245),outline=(255,255,255),width=3)
im.save("fabric3d_icon.png");im.save("fabric3d_icon.ico",sizes=[(256,256),(128,128),(64,64),(48,48),(32,32),(16,16)])
