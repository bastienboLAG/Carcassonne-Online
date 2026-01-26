import { Tile } from './modules/Tile.js';
import { Board } from './modules/Board.js';

const plateau = new Board();
let tuileEnMain = null;
let zoomLevel = 1;

async function init() {
    try {
        // Chargement du JSON
        const response = await fetch('./data/Base/04.json');
        if (!response.ok) throw new Error("Impossible de charger 04.json");
        const data = await response.json();
        
        // Création de la tuile
        tuileEnMain = new Tile(data);

        // Affichage de la prévisualisation
        const previewContainer = document.getElementById('tile-preview');
        const imgPreview = document.createElement('img');
        imgPreview.src = tuileEnMain.imagePath;
        imgPreview.id = "current-tile-img";
        previewContainer.innerHTML = ''; 
        previewContainer.appendChild(imgPreview);

        // POSE INITIALE : On utilise directement le moteur de pose
        poserTuile(50, 50, tuileEnMain);

        const container = document.getElementById('board-container');
        const board = document.getElementById('board');

        // Centrage du plateau
        setTimeout(() => {
            container.scrollLeft = 5200 - (container.clientWidth / 2);
            container.scrollTop = 5200 - (container.clientHeight / 2);
        }, 100);

        // Zoom & Drag
        setupInteractions(container, board, imgPreview);

    } catch (error) {
        console.error("Erreur fatale :", error);
    }
}

function poserTuile(x, y, tile) {
    const boardElement = document.getElementById('board');
    
    // Création de l'élément visuel
    const img = document.createElement('img');
    img.src = tile.imagePath;
    img.className = "tile";
    img.style.gridColumn = x; 
    img.style.gridRow = y;
    img.style.transform = `rotate(${tile.rotation}deg)`;
    boardElement.appendChild(img);
    
    // Enregistrement dans le Board (on crée une instance propre)
    const tuileAEnregistrer = new Tile({id: tile.id, zones: tile.zones});
    tuileAEnregistrer.rotation = tile.rotation;
    plateau.addTile(x, y, tuileAEnregistrer);

    // Mise à jour des slots cliquables
    rafraichirTousLesSlots();
}

function rafraichirTousLesSlots() {
    document.querySelectorAll('.slot').forEach(s => s.remove());
    // On parcourt toutes les tuiles posées pour générer des slots autour
    Object.keys(plateau.placedTiles).forEach(coord => {
        const [x, y] = coord.split(',').map(Number);
        genererSlotsAutour(x, y);
    });
}

function genererSlotsAutour(x, y) {
    const directions = [{dx:0, dy:-1}, {dx:1, dy:0}, {dx:0, dy:1}, {dx:-1, dy:0}];
    directions.forEach(dir => {
        const nx = x + dir.dx;
        const ny = y + dir.dy;
        
        if (plateau.isFree(nx, ny)) {
            // C'est ici que Board.canPlaceTile intervient
            if (plateau.canPlaceTile(nx, ny, tuileEnMain)) {
                if (!document.querySelector(`.slot[data-x="${nx}"][data-y="${ny}"]`)) {
                    const slot = document.createElement('div');
                    slot.className = "slot";
                    slot.dataset.x = nx; 
                    slot.dataset.y = ny;
                    slot.style.gridColumn = nx; 
                    slot.style.gridRow = ny;
                    slot.onclick = (e) => { 
                        e.stopPropagation(); 
                        poserTuile(nx, ny, tuileEnMain); 
                    };
                    document.getElementById('board').appendChild(slot);
                }
            }
        }
    });
}

function setupInteractions(container, board, imgPreview) {
    // Rotation
    document.getElementById('rotate-btn').onclick = () => {
        tuileEnMain.rotation = (tuileEnMain.rotation + 90) % 360;
        imgPreview.style.transform = `rotate(${tuileEnMain.rotation}deg)`;
        rafraichirTousLesSlots();
    };

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
        container.scrollLeft = scrollLeft - (e.pageX - container.offsetLeft - startX);
        container.scrollTop = scrollTop - (e.pageY - container.offsetTop - startY);
    });
}

init();
