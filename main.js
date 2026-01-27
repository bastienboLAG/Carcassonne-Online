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

        // Affichage de l'image dans le deck (aperçu)
        const previewContainer = document.getElementById('tile-preview');
        previewContainer.innerHTML = `<img id="current-tile-img" src="${tuileEnMain.imagePath}">`;

        // Pose de départ forcée au centre
        poserTuile(50, 50, tuileEnMain, true);

        const container = document.getElementById('board-container');
        const board = document.getElementById('board');

        // Interactions
        document.getElementById('rotate-btn').onclick = () => {
            tuileEnMain.rotation = (tuileEnMain.rotation + 90) % 360;
            document.getElementById('current-tile-img').style.transform = `rotate(${tuileEnMain.rotation}deg)`;
            rafraichirTousLesSlots();
        };

        setupNavigation(container, board);
    } catch (e) { console.error(e); }
}

function poserTuile(x, y, tile, isFirst = false) {
    // Si ce n'est pas la première, on vérifie les règles du Board
    if (!isFirst && !plateau.canPlaceTile(x, y, tile)) return;

    const boardElement = document.getElementById('board');
    const img = document.createElement('img');
    img.src = tile.imagePath;
    img.className = "tile";
    img.style.gridColumn = x; 
    img.style.gridRow = y;
    img.style.transform = `rotate(${tile.rotation}deg)`;
    boardElement.appendChild(img);
    
    // Sauvegarde logique
    const copy = new Tile({id: tile.id, zones: tile.zones});
    copy.rotation = tile.rotation;
    plateau.addTile(x, y, copy);

    rafraichirTousLesSlots();
}

function rafraichirTousLesSlots() {
    document.querySelectorAll('.slot').forEach(s => s.remove());
    for (let coord in plateau.placedTiles) {
        const [x, y] = coord.split(',').map(Number);
        genererSlotsAutour(x, y);
    }
}

function genererSlotsAutour(x, y) {
    const directions = [{dx:0, dy:-1}, {dx:1, dy:0}, {dx:0, dy:1}, {dx:-1, dy:0}];
    directions.forEach(dir => {
        const nx = x + dir.dx, ny = y + dir.dy;
        if (plateau.isFree(nx, ny) && plateau.canPlaceTile(nx, ny, tuileEnMain)) {
            const slot = document.createElement('div');
            slot.className = "slot";
            slot.style.gridColumn = nx; slot.style.gridRow = ny;
            slot.onclick = () => poserTuile(nx, ny, tuileEnMain);
            document.getElementById('board').appendChild(slot);
        }
    });
}

function setupNavigation(container, board) {
    container.addEventListener('wheel', (e) => {
        e.preventDefault();
        zoomLevel += e.deltaY > 0 ? -0.1 : 0.1;
        board.style.transform = `scale(${Math.max(0.2, zoomLevel)})`;
    }, { passive: false });
    // ... (centrage auto)
    container.scrollLeft = 5200 - (container.clientWidth / 2);
    container.scrollTop = 5200 - (container.clientHeight / 2);
}

init();
