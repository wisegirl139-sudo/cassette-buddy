import * as THREE from "three";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { MTLLoader } from "three/addons/loaders/MTLLoader.js";
const sce=new THREE.Scene();
sce.background=null;
const cam=new THREE.PerspectiveCamera(45,1,0.1,1000);
cam.position.set(0,0,5);
cam.lookAt(0,0,0);
const ren=new THREE.WebGLRenderer({antialias:true,alpha:true});
ren.setPixelRatio(window.devicePixelRatio);
document.querySelector("#sce").appendChild(ren.domElement);
//lets light up the fitting rrom , literally adding lighting and fitting to screen 
const lit=new THREE.AmbientLight(0xffffff,2);
sce.add(lit);
const sun=new THREE.DirectionalLight(0xffffff,3);
sun.position.set(2,3,5);
sce.add(sun);
function size(){
    const el= document.querySelector("#sce");
    ren.setSize(el.clientWidth,el.clientHeight);
    cam.aspect=el.clientWidth/el.clientHeight;
    cam.updateProjectionMatrix();
    ren.render(sce,cam);
}
//cassette time
let mats;
let cent;
let sca;
function addWheel(wheel, name) {
    wheel.rotation.x=-Math.PI/2;
    wheel.scale.setScalar(sca);
    const box=new THREE.Box3().setFromObject(wheel);
    const ctr=box.getCenter(new THREE.Vector3());
    const pivot= new THREE.Group();
    pivot.position.set(-cent.x*sca+ctr.x,-cent.y*sca+ctr.y,-cent.z*sca+ctr.z);
    sce.add(pivot);
    wheel.position.sub(ctr);
    pivot.add(wheel);
    parts[name]=pivot;
}
const parts={};
const mtl= new MTLLoader();
mtl.setPath("models/");
mtl.load("body.mtl",loadedMats=>{
    mats=loadedMats;
    mats.preload();
    const obj= new OBJLoader();
    obj.setMaterials(mats);
    obj.setPath("models/");
    obj.load("body.obj",body=>{
        parts.body=body;
        body.position.set(0,0,0);
        sce.add(body);
        body.rotation.x=-Math.PI/2;
        parts.body=body;
        const box = new THREE.Box3().setFromObject(body);
        cent = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        sca = 3 / Math.max(size.x, size.y, size.z);
        body.scale.setScalar(sca);
        body.position.set(-cent.x*sca,-cent.y*sca,-cent.z*sca);
        document.querySelector("#stat").textContent="";
        ren.render(sce,cam);
        const wload= new OBJLoader();
        wload.setPath("models/");
        wload.load("leftw.obj", wheel => {
            addWheel(wheel, "leftw");
        });
        const rload=new OBJLoader();
        rload.setPath("models/");
        rload.load("rightw.obj", wheel => {
            addWheel(wheel, "rightw");
        });
    
    });

});
size();
window.addEventListener("resize",size);
ren.render(sce,cam);
//forgot to comment for a while but rn im just adding like pivots and stuff might change up code drastically
function spin() {
    if (parts.leftw) parts.leftw.rotation.z += 0.05;
    if (parts.rightw) parts.rightw.rotation.z += 0.05;
    ren.render(sce, cam);
    requestAnimationFrame(spin);
}
spin();