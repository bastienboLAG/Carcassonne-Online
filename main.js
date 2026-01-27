import { Tile } from './modules/Tile.js';
import { Board } from './modules/Board.js';
import { Deck } from './modules/Deck.js';

const plateau = new Board();
const deck = new Deck();
let tuileEnMain = null;
let tuilePosee = false;
let zoomLevel = 1;

// Variables pour le drag-to-pan
let isDragging = false;
let startX = 0;
let startY = 0;
let scrollLeft = 0;
let scrollTop = 0;

async function init() {
    try {
        // Charger toutes les tuiles
        await deck.loadAllTiles();

        // Créer la tuile de départ (04)
        const startTileData = await fetch('./data/Base/04.json').then(r => r.json());
        const startTile = new Tile(startTileData);

        // Poser la tuile de départ au centre
        poserTuile(50, 50, startTile, true);

        // Piocher la première tuile en main
        piocherNouvelleTuile();

        const container = document.getElementById('board-container');
        const board = document.getElementById('board');

        // Interactions
        document.getElementById('rotate-btn').onclick = () => {
            if (tuileEnMain) {
                tuileEnMain.rotation = (tuileEnMain.rotation + 90) % 360;
                document.getElementById('current-tile-img').style.transform = `rotate(${tuileEnMain.rotation}deg)`;
                rafraichirTousLesSlots();
            }
        };

        document.getElementById('end-turn-btn').onclick = () => {
            // Vérifier que la tuile a été posée
            if (!tuilePosee) {
                alert('Vous devez poser la tuile avant de terminer votre tour !');
                return;
            }
            
            // Pour l'instant, on pioche juste une nouvelle tuile
            // Plus tard : placement de meeple, calcul de points, etc.
            piocherNouvelleTuile();
        };

        setupNavigation(container, board);
        mettreAJourCompteur();
    } catch (e) { 
        console.error(e); 
    }
}

function piocherNouvelleTuile() {
    const tileData = deck.draw();
    
    if (!tileData) {
        // Pioche vide - Fin de partie
        alert('Partie terminée ! Plus de tuiles dans la pioche.');
        document.getElementById('tile-preview').innerHTML = '<p>Fin de partie</p>';
        document.getElementById('rotate-btn').disabled = true;
        document.getElementById('end-turn-btn').disabled = true;
        return;
    }

    tuileEnMain = new Tile(tileData);
    tuileEnMain.rotation = 0;
    tuilePosee = false;

    // Affichage de l'image dans le deck (aperçu)
    const previewContainer = document.getElementById('tile-preview');
    previewContainer.innerHTML = `<img id="current-tile-img" src="${tuileEnMain.imagePath}">`;

    rafraichirTousLesSlots();
    mettreAJourCompteur();
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

    if (!isFirst) {
        tuilePosee = true;
        
        // NOUVEAU : Supprimer tous les slots immédiatement après placement
        document.querySelectorAll('.slot').forEach(s => s.remove());
        
        // Vider la tuile en main pour empêcher un nouveau placement
        // (elle sera recréée au clic sur "Terminer mon tour")
        tuileEnMain = null;
    } else {
        rafraichirTousLesSlots();
    }
}

function rafraichirTousLesSlots() {
    document.querySelectorAll('.slot').forEach(s => s.remove());
    
    // NOUVEAU : Ne générer des slots que si on a une tuile en main
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
    // Zoom avec la molette
    container.addEventListener('wheel', (e) => {
        e.preventDefault();
        zoomLevel += e.deltaY > 0 ? -0.1 : 0.1;
        zoomLevel = Math.max(0.2, Math.min(3, zoomLevel));
        board.style.transform = `scale(${zoomLevel})`;
    }, { passive: false });

    // Drag-to-pan (clic-glisser)
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
        container.scrollLeft = scrollLeft - walkX;
        container.scrollTop = scrollTop - walkY;
    });

    // Centrage initial
    container.scrollLeft = 5200 - (container.clientWidth / 2);
    container.scrollTop = 5200 - (container.clientHeight / 2);
}

init();
