import { Tile } from './modules/Tile.js';
import { Board } from './modules/Board.js';
import { Deck } from './modules/Deck.js';

const plateau = new Board();
const deck = new Deck();
let tuileEnMain = null;
let tuilePosee = false;
let zoomLevel = 1;

let isDragging = false;
let startX = 0;
let startY = 0;
let scrollLeft = 0;
let scrollTop = 0;

async function init() {
    try {
        await deck.loadAllTiles();

        // ✅ NOUVEAU : Ne plus poser la tuile 04 automatiquement
        // Juste créer un slot au centre
        creerSlotCentral();

        // ✅ NOUVEAU : La tuile 04 est la première piochée
        piocherNouvelleTuile();

        const container = document.getElementById('board-container');
        const board = document.getElementById('board');

        // Clic sur la tuile pour la tourner
        document.getElementById('tile-preview').addEventListener('click', () => {
            if (tuileEnMain && !tuilePosee) {
                // ✅ CORRECTION : Rotation visuelle toujours en sens horaire
                const currentImg = document.getElementById('current-tile-img');
                const currentRotation = tuileEnMain.rotation;
                const newRotation = (currentRotation + 90) % 360;
                
                tuileEnMain.rotation = newRotation;
                currentImg.style.transform = `rotate(${newRotation}deg)`;
                rafraichirTousLesSlots();
            }
        });

        document.getElementById('end-turn-btn').onclick = () => {
            if (!tuilePosee) {
                alert('Vous devez poser la tuile avant de terminer votre tour !');
                return;
            }
            piocherNouvelleTuile();
        };

        document.getElementById('recenter-btn').onclick = () => {
            container.scrollLeft = 5200 - (container.clientWidth / 2);
            container.scrollTop = 5200 - (container.clientHeight / 2);
        };

        setupNavigation(container, board);
        mettreAJourCompteur();
    } catch (e) { 
        console.error(e); 
    }
}

// ✅ NOUVEAU : Créer un slot au centre du plateau
function creerSlotCentral() {
    const slot = document.createElement('div');
    slot.className = "slot";
    slot.style.gridColumn = 50;
    slot.style.gridRow = 50;
    slot.onclick = () => {
        if (tuileEnMain) {
            poserTuile(50, 50, tuileEnMain, true);
        }
    };
    document.getElementById('board').appendChild(slot);
}

function piocherNouvelleTuile() {
    const tileData = deck.draw();
    
    if (!tileData) {
        alert('Partie terminée ! Plus de tuiles dans la pioche.');
        document.getElementById('tile-preview').innerHTML = '<p>Fin de partie</p>';
        document.getElementById('end-turn-btn').disabled = true;
        return;
    }

    tuileEnMain = new Tile(tileData);
    tuileEnMain.rotation = 0;
    tuilePosee = false;

    const previewContainer = document.getElementById('tile-preview');
    previewContainer.innerHTML = `<img id="current-tile-img" src="${tuileEnMain.imagePath}" style="cursor: pointer; transform: rotate(0deg);" title="Cliquez pour tourner">`;

    rafraichirTousLesSlots();
    mettreAJourCompteur();
}

function poserTuile(x, y, tile, isFirst = false) {
    if (!isFirst && !plateau.canPlaceTile(x, y, tile)) return;

    const boardElement = document.getElementById('board');
    const img = document.createElement('img');
    img.src = tile.imagePath;
    img.className = "tile";
    img.style.gridColumn = x; 
    img.style.gridRow = y;
    img.style.transform = `rotate(${tile.rotation}deg)`;
    boardElement.appendChild(img);
    
    const copy = tile.clone();
    plateau.addTile(x, y, copy);

    if (!isFirst) {
        tuilePosee = true;
        document.querySelectorAll('.slot').forEach(s => s.remove());
        document.getElementById('tile-preview').innerHTML = '<img src="./assets/Base/C2/verso.png" style="width: 120px; border: 2px solid #666;">';
        tuileEnMain = null;
    } else {
        // ✅ Première tuile posée, supprimer le slot central et générer les slots autour
        document.querySelectorAll('.slot').forEach(s => s.remove());
        rafraichirTousLesSlots();
    }
}

function rafraichirTousLesSlots() {
    document.querySelectorAll('.slot').forEach(s => s.remove());
    if (!tuileEnMain) return;
    
    for (let coord in plateau.placedTiles) {
        const [x, y] = coord.split(',').map(Number);
        genererSlotsAutour(x, y);
    }
}

function genererSlotsAutour(x, y) {
    const directions = [{dx:0, dy:-1}, {dx:1, dy:0}, {dx:0, dy:1}, {dx:-1, dy:0}];
    directions.forEach(dir => {
        const nx = x + dir.dx, ny = y + dir.dy;
        if (tuileEnMain && plateau.isFree(nx, ny) && plateau.canPlaceTile(nx, ny, tuileEnMain)) {
            const slot = document.createElement('div');
            slot.className = "slot";
            slot.style.gridColumn = nx; 
            slot.style.gridRow = ny;
            slot.onclick = () => poserTuile(nx, ny, tuileEnMain);
            document.getElementById('board').appendChild(slot);
        }
    });
}

function mettreAJourCompteur() {
    const remaining = deck.remaining();
    const total = deck.total();
    document.getElementById('tile-counter').textContent = `Tuiles : ${remaining} / ${total}`;
}

function setupNavigation(container, board) {
    container.addEventListener('wheel', (e) => {
        e.preventDefault();
        zoomLevel += e.deltaY > 0 ? -0.1 : 0.1;
        zoomLevel = Math.max(0.2, Math.min(3, zoomLevel));
        board.style.transform = `scale(${zoomLevel})`;
    }, { passive: false });

    container.addEventListener('mousedown', (e) => {
        if (e.target.classList.contains('tile') || e.target.classList.contains('slot')) {
            return;
        }
        isDragging = true;
        container.style.cursor = 'grabbing';
        startX = e.pageX - container.offsetLeft;
        startY = e.pageY - container.offsetTop;
        scrollLeft = container.scrollLeft;
        scrollTop = container.scrollTop;
    });

    container.addEventListener('mouseleave', () => {
        isDragging = false;
        container.style.cursor = 'grab';
    });

    container.addEventListener('mouseup', () => {
        isDragging = false;
        container.style.cursor = 'grab';
    });

    container.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const x = e.pageX - container.offsetLeft;
        const y = e.pageY - container.offsetTop;
        const walkX = (x - startX) * 2;
        const walkY = (y - startY) * 2;
        container
