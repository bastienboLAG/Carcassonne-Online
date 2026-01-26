import { Tile } from './modules/Tile.js';
import { Board } from './modules/Board.js';

const plateau = new Board();
let tuileEnMain = null;
let zoomLevel = 1;

async function init() {
    try {
        // 1. Chargement du JSON de la tuile 04
        const response = await fetch('./data/Base/04.json');
        if (!response.ok) throw new Error("Erreur chargement JSON");
        const data = await response.json();
        
        // 2. Création de l'objet Tile
        tuileEnMain = new Tile(data);

        // 3. Affichage dans la prévisualisation (à droite)
        const previewImg = document.getElementById('current-tile-img');
        if (previewImg) {
            previewImg.src = tuileEnMain.imagePath;
        }

        // 4. POSE DE LA TUILE DE DÉPART (Indispensable pour débloquer les slots)
        // On la pose manuellement sans vérifier canPlaceTile car c'est la première
        forceFirstTile(50, 50, tuileEnMain);

        const container = document.getElementById('board-container');
        const board = document.getElementById('board');

        // Centrage initial
        setTimeout(() => {
            container.scrollLeft = 5200 - (container.clientWidth / 2);
            container.scrollTop = 5200 - (container.clientHeight / 2);
        }, 100);

        setupInteractions(container, board);

    } catch (error) {
        console.error("Erreur critique :", error);
    }
}

// Fonction spéciale pour la toute première tuile qui n'a pas de voisins
function forceFirstTile(x, y, tile) {
    const boardElement = document.getElementById('board');
    const img = document.createElement('img');
    img.src = tile.imagePath;
    img.className = "tile";
    img.style.gridColumn = x; 
    img.style.gridRow = y;
    boardElement.appendChild(img);
    
    // On l'ajoute au moteur logique
    plateau.addTile(x, y, tile);
    
    // Maintenant on peut générer les slots autour
    rafraichirTousLesSlots();
}

function poserTuile(x, y, tile) {
    if (!plateau.canPlaceTile(x, y, tile)) return;

    const boardElement = document.getElementById('board');
    const img = document.createElement('img');
    img.src = tile.imagePath;
    img.className = "tile";
    img.style.gridColumn = x; 
    img.style.gridRow = y;
    img.style.transform = `rotate(${tile.rotation}deg)`;
    boardElement.appendChild(img);
    
    // Création d'une copie pour le plateau pour garder la rotation actuelle
    const tuileFixee = new Tile({id: tile.id, zones: tile.zones});
    tuileFixee.rotation = tile.rotation;
    plateau.addTile(x, y, tuileFixee);

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
        const nx = x + dir.dx;
        const ny = y + dir.dy;
        if (plateau.isFree(nx, ny)) {
            // C'est ici que canPlaceTile vérifie la tuile 04 contre les voisins
            if (plateau.canPlaceTile(nx, ny, tuileEnMain)) {
                const slot = document.createElement('div');
                slot.className = "slot";
                slot.style.gridColumn = nx; 
                slot.style.gridRow = ny;
                slot.onclick = () => poserTuile(nx, ny, tuileEnMain);
                document.getElementById('board').appendChild(slot);
            }
        }
    });
}

function setupInteractions(container, board) {
    document.getElementById('rotate-btn').onclick = () => {
        tuileEnMain.rotation = (tuileEnMain.rotation + 90) % 360;
        document.getElementById('current-tile-img').style.transform = `rotate(${tuileEnMain.rotation}deg)`;
        rafraichirTousLesSlots();
    };

    container.addEventListener('wheel', (e) => {
        e.preventDefault();
        zoomLevel = Math.min(Math.max(0.2, zoomLevel + (e.deltaY > 0 ? -0.1 : 0.1)), 2);
        board.style.transform = `scale(${zoomLevel})`;
    }, { passive: false });

    let isDown = false, startX, startY, scrollLeft, scrollTop;
    container.onmousedown = (e) => {
        if (e.target !== container && e.target !== board) return;
        isDown = true;
        startX = e.pageX - container.offsetLeft;
        startY = e.pageY - container.offsetTop;
        scrollLeft = container.scrollLeft;
        scrollTop = container.scrollTop;
    };
    window.onmouseup = () => isDown = false;
    container.onmousemove = (e) => {
        if (!isDown) return;
        container.scrollLeft = scrollLeft - (e.pageX - container.offsetLeft - startX);
        container.scrollTop = scrollTop - (e.pageY - container.offsetTop - startY);
    };
}

init();
