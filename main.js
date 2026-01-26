import { Tile } from './modules/Tile.js';
import { Board } from './modules/Board.js';

const plateau = new Board();
let tuileEnMain = null;

async function init() {
    try {
        // 1. Chargement de la tuile de départ
        const response = await fetch('./data/Base/04.json');
        const data = await response.json();
        tuileEnMain = new Tile(data);

        // 2. Affichage Preview
        const previewContainer = document.getElementById('tile-preview');
        const imgPreview = document.createElement('img');
        imgPreview.src = tuileEnMain.imagePath;
        imgPreview.id = "current-tile-img";
        previewContainer.innerHTML = ''; 
        previewContainer.appendChild(imgPreview);

        // 3. Pose de la tuile de départ (50, 50)
        poserTuile(50, 50, tuileEnMain);

        // 4. Centrage du plateau
        setTimeout(() => {
            const container = document.getElementById('board-container');
            container.scrollLeft = 5200 - (container.clientWidth / 2);
            container.scrollTop = 5200 - (container.clientHeight / 2);
        }, 100);

        // 5. Rotation
        let totalRotation = 0;
        document.getElementById('rotate-btn').onclick = () => {
            totalRotation += 90;
            imgPreview.style.transform = `rotate(${totalRotation}deg)`;
            tuileEnMain.rotation = totalRotation % 360;
        };

    } catch (error) {
        console.error("Erreur d'initialisation :", error);
    }
}

function poserTuile(x, y, tile) {
    const boardElement = document.getElementById('board');
    
    // Création de l'image sur le plateau
    const img = document.createElement('img');
    img.src = tile.imagePath;
    img.className = "tile";
    img.style.gridColumn = x; 
    img.style.gridRow = y;
    img.style.transform = `rotate(${tile.rotation}deg)`;
    
    boardElement.appendChild(img);
    plateau.addTile(x, y, tile);

    // Supprimer le slot cliquable ici même
    const existingSlot = document.querySelector(`.slot[data-x="${x}"][data-y="${y}"]`);
    if (existingSlot) existingSlot.remove();

    // Créer les nouveaux slots autour
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

        // On vérifie si la case est libre dans Board.js
        if (plateau.isFree(nx, ny)) {
            // Éviter de créer deux fois le même slot
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
