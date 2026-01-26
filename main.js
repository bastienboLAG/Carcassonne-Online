import { Tile } from './modules/Tile.js';
import { Board } from './modules/Board.js';

const plateau = new Board();
let tuileEnMain = null;
let zoomLevel = 1; // Niveau de zoom initial

async function init() {
    try {
        const response = await fetch('./data/Base/04.json');
        const data = await response.json();
        tuileEnMain = new Tile(data);

        const previewContainer = document.getElementById('tile-preview');
        const imgPreview = document.createElement('img');
        imgPreview.src = tuileEnMain.imagePath;
        imgPreview.id = "current-tile-img";
        previewContainer.innerHTML = ''; 
        previewContainer.appendChild(imgPreview);

        poserTuile(50, 50, tuileEnMain);

        const container = document.getElementById('board-container');
        const board = document.getElementById('board');

        // Centrage initial
        setTimeout(() => {
            container.scrollLeft = 5200 - (container.clientWidth / 2);
            container.scrollTop = 5200 - (container.clientHeight / 2);
        }, 100);

        // --- SYSTÈME DE ZOOM ---
        container.addEventListener('wheel', (e) => {
                e.preventDefault();
                const delta = e.deltaY > 0 ? -0.1 : 0.1;
                zoomLevel = Math.min(Math.max(0.2, zoomLevel + delta), 2); // Limite entre 20% et 200%
                board.style.transform = `scale(${zoomLevel})`;
                board.style.transformOrigin = "center center";
        }, { passive: false });

        // Rotation
        let totalRotation = 0;
        document.getElementById('rotate-btn').onclick = () => {
            totalRotation += 90;
            imgPreview.style.transform = `rotate(${totalRotation}deg)`;
            tuileEnMain.rotation = totalRotation % 360;
        };

    } catch (error) {
        console.error("Erreur :", error);
    }
}

// ... garde le reste de tes fonctions poserTuile et genererSlotsAutour identiques ...

function poserTuile(x, y, tile) {
    const boardElement = document.getElementById('board');
    const img = document.createElement('img');
    img.src = tile.imagePath;
    img.className = "tile";
    img.style.gridColumn = x; 
    img.style.gridRow = y;
    img.style.transform = `rotate(${tile.rotation}deg)`;
    boardElement.appendChild(img);
    plateau.addTile(x, y, tile);

    const existingSlot = document.querySelector(`.slot[data-x="${x}"][data-y="${y}"]`);
    if (existingSlot) existingSlot.remove();
    genererSlotsAutour(x, y);
}

function genererSlotsAutour(x, y) {
    const directions = [{ dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }];
    directions.forEach(dir => {
        const nx = x + dir.dx;
        const ny = y + dir.dy;
        if (plateau.isFree(nx, ny)) {
            if (!document.querySelector(`.slot[data-x="${nx}"][data-y="${ny}"]`)) {
                const slot = document.createElement('div');
                slot.className = "slot";
                slot.dataset.x = nx;
                slot.dataset.y = ny;
                slot.style.gridColumn = nx;
                slot.style.gridRow = ny;
                slot.onclick = () => poserTuile(nx, ny, tuileEnMain);
                document.getElementById('board').appendChild(slot);
            }
        }
    });
}

init();

