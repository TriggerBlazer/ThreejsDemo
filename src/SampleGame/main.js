import {GameViewer } from './GameViewer';



const gameViewer = new GameViewer();
const container = document.getElementById("container");
await gameViewer.init(container);
animation();




window.addEventListener('resize', onWindowResize);
document.addEventListener('keydown', onKeyDown);
document.addEventListener('keyup', onKeyUp);

function animation() {
    requestAnimationFrame(animation);
    gameViewer.render();
}

function onWindowResize() {
    gameViewer.onWindowResize();
}

function onKeyDown(event) {
    gameViewer.onKeyDown(event);
}

function onKeyUp(event) {
    gameViewer.onKeyUp(event);
}