import { Tile } from './modules/Tile.js';
import { Board } from './modules/Board.js';

const plateau = new Board();
let tuileEnMain = null;

async function init() {
    try {
        const response = await fetch('./data/Base/04.json');
        const data = await response.json();
        tuileEnMain = new Tile(data);

        // Preview
        const previewContainer = document.getElementById('tile-preview');
        const imgPreview = document.createElement('img');
        imgPreview.src = tuileEnMain.imagePath;
        imgPreview.id = "current-tile-img";
        previewContainer.innerHTML = ''; 
        previewContainer.appendChild(imgPreview);

        // On pose la tuile de départ au centre
        poserTuile(50, 50, tuileEnMain);

        // Centrage initial
        setTimeout(() => {
            const container = document.getElementById('board-container');
            container.scrollLeft = 5200 - (container.clientWidth / 2);
            container.scrollTop = 5200 - (container.clientHeight / 2);
        }, 100);

        // Rotation
        let totalRotation = 0;
        document.getElementById('rotate-btn').onclick = () => {
            totalRotation += 90;
            imgPreview.style.transform = `rotate(${totalRotation}deg)`;
            tuileEnMain.rotation = totalRotation % 360;
        };

    } catch (error) { console.error(error); }
}

function poserTuile(x, y, tile) {
    const boardElement = document.getElementById('board');
    
    // 1. On crée l'image de la tuile
    const img = document.createElement('img');
    img.src = tile.imagePath;
    img.className = "tile";
    img.style.gridColumn = x; 
    img.style.gridRow = y;
    img.style.transform = `rotate(${tile.rotation}deg)`;
    
    boardElement.appendChild(img);
    plateau.addTile(x, y, tile);

    // 2. On supprime le slot sur lequel on a cliqué s'il existe
    const oldSlot = document.querySelector(`.slot[data-x="${x}"][data-y="${y}"]`);
    if (oldSlot) oldSlot.remove();

    // 3. On génère des slots autour de la nouvelle tuile
    genererSlotsAutour(x, y);
}

function genererSlotsAutour(x, y) {
    const directions = [
        { dx: 0, dy: -1 }, // Nord
        { dx: 1, dy: 0 },  // Est
        { dx: 0, dy: 1 },  // Sud
        { dx: -1, dy: 0 }  // Ouest
    ];

    directions.forEach(dir => {
        const nx = x + dir.dx;
        const ny = y + dir.dy;

        // Si la case est vide, on place un slot cliquable
        if (plateau.isFree(nx, ny) && !document.querySelector(`.slot[data-x="${nx}"][data-y="${ny}"]`)) {
            const slot = document.createElement('div');
            slot.className = "slot";
            slot.dataset.x = nx;
            slot.dataset.y = ny;
            slot.style.gridColumn = nx;
            slot.style.gridRow = ny;

            slot.onclick = () => {
                poserTuile(nx, ny, tuileEnMain);
            };

            document.getElementById('board').appendChild(slot);
        }
    });
}

init();
