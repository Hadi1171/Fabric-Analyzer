import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/controls/OrbitControls.js";

let renderer,scene,camera,controls,root,lastProject,lastFile,lastData,resizeObserver;
const $=id=>document.getElementById(id);
function status(s){$("simStatus").textContent=s;}
function listItem(list,index){return list?.[index]||{};}
function yarnColor(list,index,fallback){return listItem(list,index).color||fallback;}
function parseSequence(value){return String(value||"").trim().split(/[.,;\s]+/).filter(Boolean).map(Number);}
function sequenceIndex(sequence,index,count){if(!count)return -1;if(!sequence.length)return index%count;const raw=sequence[index%sequence.length];return Number.isInteger(raw)&&raw>=1&&raw<=count?raw-1:-1;}
function countToTex(y){const n=Number(y?.count),raw=String(y?.unit||"Nm").trim().toLowerCase().replace(/[\s._-]/g,"");if(!(n>0&&Number.isFinite(n)))return null;switch(raw){case"nm":case"metric":return 1000/n;case"ne":case"nec":case"englishcotton":return 590.541/n;case"tex":return n;case"dtex":case"decitex":return n/10;case"den":case"denier":case"d":return n/9;case"nw":case"worsted":return 885.811/n;case"lea":case"linen":return 1652.62/n;default:return null;}}function yarnDimensions(y,density,spacing){
 const tex=countToTex(y),rho=1400;
 if(!tex)return{tex:null,radius:spacing*.48};
 // Convert linear density (Tex) to an estimated physical yarn diameter.
 // Keep the rendered diameter proportional to the real diameter, capped
 // at the available pitch so neighboring yarns do not overlap excessively.
 const diameterMm=Math.sqrt(4*tex/(Math.PI*rho));
 const pitchMm=10/density;
 const radiusRatio=THREE.MathUtils.clamp(diameterMm/(2*pitchMm),.025,.49);
 return{tex,diameterMm,radius:spacing*radiusRatio};
}
function makeFiberTexture(){
 const c=document.createElement("canvas");c.width=512;c.height=256;
 const x=c.getContext("2d",{alpha:false});
 x.fillStyle="#808080";x.fillRect(0,0,c.width,c.height);
 // Deterministic fine spun-yarn grain. Fibers follow the yarn axis but drift
 // slightly around the surface, avoiding the artificial parallel-rib look.
 let seed=0x4f1bbcdc;
 const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 // Very low-contrast fiber bed at several scales.
 for(let i=0;i<12500;i++){
  const px=rand()*c.width,y=rand()*c.height,len=4+rand()*58;
  const drift=(rand()-.5)*5,alpha=.012+rand()*.035;
  x.strokeStyle=rand()>.5?"rgba(255,255,255,"+alpha+")":"rgba(20,20,20,"+alpha+")";
  x.lineWidth=.2+rand()*.55;x.beginPath();x.moveTo(px,y);
  x.bezierCurveTo(px+len*.3,y+drift,px+len*.72,y-drift*.35,px+len,y+(rand()-.5)*1.2);x.stroke();
 }
 // Occasional soft fiber bundles; deliberately sparse so they read as yarn,
 // not fuzz, glitter or a repeated embossed stripe.
 for(let i=0;i<620;i++){
  const px=rand()*c.width,y=rand()*c.height,len=10+rand()*92;
  const alpha=.018+rand()*.028;
  x.strokeStyle=rand()>.5?"rgba(255,255,255,"+alpha+")":"rgba(18,18,18,"+alpha+")";
  x.lineWidth=.45+rand()*.75;x.beginPath();x.moveTo(px,y);
  x.quadraticCurveTo(px+len*.48,y+(rand()-.5)*3,px+len,y+(rand()-.5)*2);x.stroke();
 }
 // Subtle broken diagonal flecks suggest fibers wrapping through the yarn twist.
 for(let i=0;i<1150;i++){
  const px=rand()*c.width,y=rand()*c.height,len=2+rand()*13;
  const alpha=.012+rand()*.025;
  x.strokeStyle=rand()>.5?"rgba(255,255,255,"+alpha+")":"rgba(16,16,16,"+alpha+")";
  x.lineWidth=.25+rand()*.45;x.beginPath();x.moveTo(px,y);
  x.lineTo(px+len,y+(rand()-.5)*2.4);x.stroke();
 }
 const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;
 t.colorSpace=THREE.NoColorSpace;t.anisotropy=8;return t;
}
const fiberTexture=makeFiberTexture();
function materialFor(hex){
 return new THREE.MeshStandardMaterial({
  color:new THREE.Color(hex),roughness:.97,roughnessMap:fiberTexture,
  metalness:0,bumpMap:fiberTexture,bumpScale:.026
 });
}
function init(){if(renderer)return;const host=$("simViewport");scene=new THREE.Scene();scene.background=new THREE.Color("#0b0f16");camera=new THREE.PerspectiveCamera(38,1,.001,1000);camera.position.set(7,6,8);renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.setSize(host.clientWidth,host.clientHeight);renderer.shadowMap.enabled=false;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;host.appendChild(renderer.domElement);controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;scene.add(new THREE.HemisphereLight(0xf1f3f5,0x555b64,1.7));const key=new THREE.DirectionalLight(0xffffff,2.1);key.position.set(3,9,5);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-9;key.shadow.camera.right=9;key.shadow.camera.top=9;key.shadow.camera.bottom=-9;key.shadow.camera.near=.1;key.shadow.camera.far=30;key.shadow.bias=-0.00018;key.shadow.normalBias=.025;key.shadow.radius=3;scene.add(key);const fill=new THREE.DirectionalLight(0xcbdcff,1.2);fill.position.set(-6,4,3);scene.add(fill);root=new THREE.Group();scene.add(root);resizeObserver=new ResizeObserver(()=>{const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);});resizeObserver.observe(host);(function loop(){requestAnimationFrame(loop);controls.update();renderer.render(scene,camera);})();}
function readMap(file){return file.arrayBuffer().then(buf=>{const b=new Uint8Array(buf);if(b.length<133||b[0]!==0x81||b[1]!==0xfe||b[2]!==0x01||b[3]!==0x01)throw Error("Invalid or unsupported JC5 file. Use an EAT OpenWeave Converter JC5 file.");const head=new TextDecoder().decode(b.slice(0,512)),match=head.match(new RegExp("Area\\s+1:\\s*(\\d+)\\s+hooks","i"));if(!match)throw Error("JC5 header does not contain an Area 1 hook count.");const width=Number(match[1]),stride=Math.ceil(width/8),dataStart=match.index+match[0].length+1,payload=b.length-dataStart;if(!Number.isInteger(width)||width<1||dataStart>=b.length||payload<=0||payload%stride!==0)throw Error("JC5 hook matrix dimensions are invalid or incomplete.");const height=payload/stride,cells=new Uint8Array(width*height);let warpLift=0,weftLift=0;for(let y=0;y<height;y++){const row=dataStart+(height-1-y)*stride;for(let x=0;x<width;x++){const bit=(b[row+(x>>3)]>>(x&7))&1;const i=y*width+x;if(bit){cells[i]=1;warpLift++;}else{cells[i]=2;weftLift++;}}}return{width,height,cells,warpLift,weftLift,invalid:0,total:width*height,sourceFormat:"JC5 EAT",sourceBits:1};});}
function disposeRoot(){root.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material.dispose();}});root.clear();}
function addYarnTube(paths,pointCount,pointAt,acrossRadius,heightRadius,warp,material,radialSegments,subdivisions){if(!paths.length||pointCount<2)return;const sides=radialSegments,steps=Math.max(1,subdivisions||1),sampleCount=(pointCount-1)*steps+1,vertexCount=paths.length*sampleCount*sides,indexCount=paths.length*(sampleCount-1)*sides*6,positions=new Float32Array(vertexCount*3),uvs=new Float32Array(vertexCount*2),indices=new Uint32Array(indexCount);let vi=0,ii=0;for(let p=0;p<paths.length;p++){for(let j=0;j<sampleCount;j++){const t=j/steps,seg=Math.min(pointCount-2,Math.floor(t)),f=t-seg,e=f*f*(3-2*f),a=pointAt(paths[p],seg),b=pointAt(paths[p],seg+1),cx=a.x+(b.x-a.x)*e,cy=a.y+(b.y-a.y)*e,cz=a.z+(b.z-a.z)*e,u=(j/(sampleCount-1))*Math.max(1,(pointCount-1)/12);for(let k=0;k<sides;k++){const angle=(k/sides)*Math.PI*2,across=Math.cos(angle)*acrossRadius,vertical=Math.sin(angle)*heightRadius,base=vi*3;if(warp){positions[base]=cx+across;positions[base+1]=cy+vertical;positions[base+2]=cz;}else{positions[base]=cx;positions[base+1]=cy+vertical;positions[base+2]=cz+across;}uvs[vi*2]=u;uvs[vi*2+1]=k/sides;vi++;}if(j>0){const current=(p*sampleCount+j)*sides,previous=current-sides;for(let k=0;k<sides;k++){const next=(k+1)%sides,a=previous+k,b=previous+next,c=current+k,d=current+next;if(warp){indices[ii++]=a;indices[ii++]=b;indices[ii++]=c;indices[ii++]=b;indices[ii++]=d;indices[ii++]=c;}else{indices[ii++]=a;indices[ii++]=c;indices[ii++]=b;indices[ii++]=b;indices[ii++]=c;indices[ii++]=d;}}}}}const geo=new THREE.BufferGeometry();geo.setAttribute("position",new THREE.BufferAttribute(positions,3));geo.setAttribute("uv",new THREE.BufferAttribute(uvs,2));geo.setIndex(new THREE.BufferAttribute(indices,1));geo.computeVertexNormals();const yarnMaterial=material.clone();yarnMaterial.side=THREE.DoubleSide;const mesh=new THREE.Mesh(geo,yarnMaterial);mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);}

function build(data,p){disposeRoot();const wd=Number(p.warpDensity),fd=Number(p.weftDensity);if(!(wd>0&&fd>0&&Number.isFinite(wd)&&Number.isFinite(fd)))throw Error("Warp and weft densities must both be greater than zero.");const dx=1/wd,dz=1/fd,xSpan=(data.width-1)*dx,zSpan=(data.height-1)*dz,maxSpan=Math.max(xSpan,zSpan,.01),displayScale=6/maxSpan,sx=dx*displayScale,sz=dz*displayScale,warpN=Math.max(1,Number(p.warpSystems)||1),weftN=Math.max(1,Number(p.weftSystems)||1),warpSeq=parseSequence(p.warpRhythm),weftSeq=parseSequence(p.weftRhythm),warpBy=Array.from({length:warpN},()=>[]),weftBy=Array.from({length:weftN},()=>[]),radialSegments=data.total>500000?6:data.total>150000?8:12,curveSubdivisions=data.total>500000?1:data.total>150000?2:3;const warpDims=Array.from({length:warpN},(_,i)=>yarnDimensions(listItem(p.warpYarns,i),wd,sx)),weftDims=Array.from({length:weftN},(_,i)=>yarnDimensions(listItem(p.weftYarns,i),fd,sz));
for(let x=0;x<data.width;x++){const si=sequenceIndex(warpSeq,x,warpN);if(si<0)throw Error("Warp rhythm refers to a system that is not configured.");warpBy[si].push(x);}
for(let y=0;y<data.height;y++){const si=sequenceIndex(weftSeq,y,weftN);if(si<0)throw Error("Weft rhythm refers to a system that is not configured.");weftBy[si].push(y);}
const warpMat=[],weftMat=[];for(let i=0;i<warpN;i++)warpMat.push(materialFor(yarnColor(p.warpYarns,i,"#eeeeee")));for(let i=0;i<weftN;i++)weftMat.push(materialFor(yarnColor(p.weftYarns,i,"#d92d3a")));
for(const m of warpMat){m.roughness=.96;m.metalness=0;}
const midX=(data.width-1)/2,midZ=(data.height-1)/2;for(let s=0;s<warpN;s++){const d=warpDims[s],pointAt=(x,y)=>{const cell=data.cells[y*data.width+x];return new THREE.Vector3((x-midX)*sx,cell===1?d.radius:cell===2?-d.radius:0,(y-midZ)*sz);};addYarnTube(warpBy[s],data.height,pointAt,d.radius,d.radius,true,warpMat[s],radialSegments,curveSubdivisions);}
for(let s=0;s<weftN;s++){const d=weftDims[s],pointAt=(y,x)=>{const cell=data.cells[y*data.width+x];return new THREE.Vector3((x-midX)*sx,cell===2?d.radius:cell===1?-d.radius:0,(y-midZ)*sz);};addYarnTube(weftBy[s],data.width,pointAt,d.radius,d.radius,false,weftMat[s],radialSegments,curveSubdivisions);}
const fabricWidth=Math.max(sx,xSpan),fabricLength=Math.max(sz,zSpan);
const box=new THREE.Box3().setFromObject(root);if(!box.isEmpty()){const center=box.getCenter(new THREE.Vector3());root.position.sub(center);const sphere=box.getBoundingSphere(new THREE.Sphere()),vFov=THREE.MathUtils.degToRad(camera.fov),aspect=Math.max(.5,$("simViewport").clientWidth/Math.max(1,$("simViewport").clientHeight)),hFov=2*Math.atan(Math.tan(vFov/2)*aspect),limitingFov=Math.min(vFov,hFov),distance=(sphere.radius/Math.sin(limitingFov/2))*1.08,dir=new THREE.Vector3(.22,.42,1).normalize();camera.position.copy(dir.multiplyScalar(distance));controls.target.set(0,0,0);camera.lookAt(0,0,0);controls.minDistance=Math.max(.015,distance*.004);controls.maxDistance=distance*12;controls.update();}
$("simStats").innerHTML='<b>Source:</b> EAT JC5 · '+data.width.toLocaleString()+' hooks × '+data.height.toLocaleString()+' picks<br><b>Jacquard configuration:</b> '+(p.jacquardCount?String(p.jacquardCount)+' selected':'Not specified · not inferred from hook count')+'<br><b>Complete matrix:</b> '+data.total.toLocaleString()+' crossings processed · 100% width and height<br><b>Warp density:</b> '+wd+' ends/cm · <b>Weft density:</b> '+fd+' picks/cm<br><b>Fabric footprint:</b> '+xSpan.toFixed(3)+' × '+zSpan.toFixed(3)+' cm<br><b>Rendered yarns:</b> '+data.width.toLocaleString()+' warp ends · '+data.height.toLocaleString()+' weft picks';const note=$("simAccuracyNote");if(note)note.textContent="Full JC5 matrix rendered. Warp and weft are built as continuous rounded yarn tubes with matte, directional fiber-grain texture and rounded yarn cross-sections. No simulated pile, metallic shine, clearcoat or glossy effects are applied; the fiber grain is a visual texture, not a physical fiber solver.";}
function renderColorControls(p){const groups=[["warp","WARP",p.warpYarns||[],"simWarpColorControls"],["weft","WEFT",p.weftYarns||[],"simWeftColorControls"]];for(const [key,label,list,target] of groups){$(target).innerHTML='<div class="sim-yarn-colors">'+list.map((y,i)=>'<label class="sim-color-row"><span>'+label+' '+(i+1)+' · '+(y.type||"Yarn")+'</span><input type="color" data-yarn-group="'+key+'" data-yarn-index="'+i+'" value="'+(y.color||(key==="warp"?"#d92d3a":"#eeeeee"))+'"></label>').join("")+'</div>';}}
function bindSimulatorSettings(){const panel=$("simSettings");if(panel.dataset.bound)return;panel.dataset.bound="1";panel.addEventListener("change",e=>{const t=e.target;if(t.dataset.yarnGroup){const group=t.dataset.yarnGroup,index=Number(t.dataset.yarnIndex);if(lastProject&&lastProject[group+"Yarns"]&&lastProject[group+"Yarns"][index]){lastProject[group+"Yarns"][index].color=t.value;if(lastData)build(lastData,lastProject);}}});}
async function rebuild(){if(!lastFile||!lastProject){status("Load a JC5 file from the project wizard first.");return;}try{status("Reading the complete JC5 hook matrix…");const data=await readMap(lastFile);lastData=data;status("Building every warp end and weft pick…");bindSimulatorSettings();renderColorControls(lastProject);build(data,lastProject);status("3D FABRIC PREVIEW READY");}catch(e){console.error(e);status("Validation error: "+e.message);$("simStats").textContent=e.message;}}
window.addEventListener("fabric3d:open-simulator",e=>{lastProject=e.detail.project;lastFile=e.detail.file;init();rebuild();});

$("simJpeg").addEventListener("click",()=>{if(!renderer)return;renderer.render(scene,camera);const a=document.createElement("a");a.download="fabric-3d-preview.jpg";a.href=renderer.domElement.toDataURL("image/jpeg",.96);a.click();});
$("simZoomIn").addEventListener("click",()=>{if(!controls)return;controls.dollyIn(1.45);controls.update();});
$("simZoomOut").addEventListener("click",()=>{if(!controls)return;controls.dollyOut(1.45);controls.update();});
