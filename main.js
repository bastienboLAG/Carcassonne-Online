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

        // Pose initiale forcée au centre
        poserTuile(50, 50, tuileEnMain);

        const container = document.getElementById('board-container');
        const board = document.getElementById('board');

        setTimeout(() => {
            container.scrollLeft = 5200 - (container.clientWidth / 2);
            container.scrollTop = 5200 - (container.clientHeight / 2);
        }, 100);

        // Zoom
        container.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            zoomLevel = Math.min(Math.max(0.2, zoomLevel + delta), 2);
            board.style.transform = `scale(${zoomLevel})`;
        }, { passive: false });

        // Drag
        let isDown = false, startX, startY, scrollLeft, scrollTop;
        container.addEventListener('mousedown', (e) => {
            if (e.target !== container && e.target !== board) return;
            isDown = true;
            startX = e.pageX - container.offsetLeft;
            startY = e.pageY - container.offsetTop;
            scrollLeft = container.scrollLeft;
            scrollTop = container.scrollTop;
        });
        window.addEventListener('mouseup', () => isDown = false);
        container.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            const x = e.pageX - container.offsetLeft;
            const y = e.pageY - container.offsetTop;
            container.scrollLeft = scrollLeft - (x - startX);
            container.scrollTop = scrollTop - (y - startY);
        });

        // Rotation + Refresh des slots
        document.getElementById('rotate-btn').onclick = () => {
            tuileEnMain.rotation = (tuileEnMain.rotation + 90) % 360;
            imgPreview.style.transform = `rotate(${tuileEnMain.rotation}deg)`;
            
            // Crucial : Quand on tourne la tuile, les endroits où on peut la poser changent !
            rafraichirTousLesSlots();
        };

    } catch (error) { console.error(error); }
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
    
    // On crée une COPIE de la tuile pour le plateau
    const tuileFixee = new Tile({id: tile.id, zones: tile.zones});
    tuileFixee.rotation = tile.rotation;
    plateau.addTile(x, y, tuileFixee);

    rafraichirTousLesSlots();
}

function rafraichirTousLesSlots() {
    // Supprime tous les slots existants
    document.querySelectorAll('.slot').forEach(s => s.remove());
    
    // Pour chaque tuile déjà posée, on regarde autour
    for (let coord in plateau.placedTiles) {
        const [x, y] = coord.split(',').map(Number);
        genererSlotsAutour(x, y);
    }
}

function genererSlotsAutour(x, y) {
    const directions = [{dx:0, dy:-1}, {dx:1, dy:0}, {dx:0, dy:1}, {dx:-1, dy:0}];
    directions.forEach(dir => {
        const nx = x + dir.dx;
        const ny = y + dir.dy;
        if (plateau.isFree(nx, ny)) {
            // ON VERIFIE SI LA TUILE EN MAIN PEUT ALLER LA
            if (plateau.canPlaceTile(nx, ny, tuileEnMain)) {
                if (!document.querySelector(`.slot[data-x="${nx}"][data-y="${ny}"]`)) {
                    const slot = document.createElement('div');
                    slot.className = "slot";
                    slot.dataset.x = nx; slot.dataset.y = ny;
                    slot.style.gridColumn = nx; slot.style.gridRow = ny;
                    slot.onclick = (e) => { e.stopPropagation(); poserTuile(nx, ny, tuileEnMain); };
                    document.getElementById('board').appendChild(slot);
                }
            }
        }
    });
}

init();
