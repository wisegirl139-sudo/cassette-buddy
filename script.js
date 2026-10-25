import * as THREE from "three";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { MTLLoader } from "three/addons/loaders/MTLLoader.js";
const sce=new THREE.Scene();
sce.background=null;
const cam=new THREE.PerspectiveCamera(45,1,0.1,1000);
cam.position.z=5;
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
    ren.setSize(document.querySelector("#sce").clientWidth,document.querySelector("#sce").clientHeight);
    cam.aspect=document.querySelector("#sce").clientWidth/document.querySelector("#sce").clientHeight;
    cam.updateProjectionMatrix();
}
//cassette time
const parts={};
const mtl= new MTLLoader();
mtl.setPath("models/");
mtl.load("body.mtl",mats=>{
    mats.preload();
    const obj= new OBJLoader();
    obj.setMaterials(mats);
    obj.setPath("models/");
    obj.load("body.obj",body=>{
        parts.body=body;
        body.position.set(0,0,0);
        sce.add(body);
        parts.body=body;
        const box=new THREE.Box3().setFromObject(body);
        const cent=box.getCenter(new THREE.Vector3());
        body.position.sub(cent);
        const size=box.getSize(new THREE.Vector3());
        const sca=3/Math.max(size.x,size.y,size.z);
        body.scale.setScalar(sca);
        document.querySelector("#stat").textContent="";
        ren.render(sce,cam);
    });
});
size();
window.addEventListener("resize",size);
cam.position.set(0,0,5);
cam.lookAt(0,0,0);
ren.render(sce,cam);