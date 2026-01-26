import { Tile } from './modules/Tile.js';
import { Board } from './modules/Board.js';

const plateau = new Board();
let tuileEnMain = null;
let zoomLevel = 1;

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

        // 1. Centrage initial
        setTimeout(() => {
            container.scrollLeft = 5200 - (container.clientWidth / 2);
            container.scrollTop = 5200 - (container.clientHeight / 2);
        }, 100);

        // 2. Système de Zoom (Molette)
        container.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            zoomLevel = Math.min(Math.max(0.2, zoomLevel + delta), 2);
            board.style.transform = `scale(${zoomLevel})`;
            board.style.transformOrigin = "center center";
        }, { passive: false });

        // 3. Système de Drag (Glisser le plateau)
        let isDown = false;
        let startX, startY, scrollLeft, scrollTop;

        container.addEventListener('mousedown', (e) => {
            // Si on clique sur un slot ou une tuile, on ne drag pas
            if (e.target !== container && e.target !== board) return;
            
            isDown = true;
            container.style.cursor = 'grabbing';
            startX = e.pageX - container.offsetLeft;
            startY = e.pageY - container.offsetTop;
            scrollLeft = container.scrollLeft;
            scrollTop = container.scrollTop;
        });

        container.addEventListener('mouseleave', () => {
            isDown = false;
            container.style.cursor = 'grab';
        });

        container.addEventListener('mouseup', () => {
            isDown = false;
            container.style.cursor = 'grab';
        });

        container.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - container.offsetLeft;
            const y = e.pageY - container.offsetTop;
            const walkX = (x - startX); 
            const walkY = (y - startY);
            container.scrollLeft = scrollLeft - walkX;
            container.scrollTop = scrollTop - walkY;
        });

        // 4. Rotation
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
    const directions = [
        { dx: 0, dy: -1 }, { dx: 1, dy: 0 },
        { dx: 0, dy: 1 }, { dx: -1, dy: 0 }
    ];

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

                slot.onclick = (e) => {
                    e.stopPropagation(); // Empêche le drag de se déclencher
                    poserTuile(nx, ny, tuileEnMain);
                };

                document.getElementById('board').appendChild(slot);
            }
        }
    });
}

init();
