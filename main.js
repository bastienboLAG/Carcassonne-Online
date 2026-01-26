import { Tile } from './modules/Tile.js';
import { Board } from './modules/Board.js';

const plateau = new Board();

async function init() {
    try {
        const response = await fetch('./data/Base/04.json');
        const data = await response.json();
        const maTuile = new Tile(data);

        // 1. Affichage dans la "main" du joueur (Preview)
        const previewContainer = document.getElementById('tile-preview');
        const imgPreview = document.createElement('img');
        imgPreview.src = maTuile.imagePath;
        imgPreview.id = "current-tile-img";
        previewContainer.innerHTML = ''; 
        previewContainer.appendChild(imgPreview);

        // 2. Pose automatique sur le plateau (Position 0,0)
        poserTuileSurPlateau(maTuile, 0, 0);

        // Rotation de la preview
        let currentRotation = 0;
        document.getElementById('rotate-btn').onclick = () => {
            currentRotation += 90;
            imgPreview.style.transform = `rotate(${currentRotation}deg)`;
            maTuile.rotation = currentRotation % 360;
        };

    } catch (error) {
        console.error("Erreur :", error);
    }
}

function poserTuileSurPlateau(tile, x, y) {
    const boardElement = document.getElementById('board');
    const img = document.createElement('img');
    
    img.src = tile.imagePath;
    img.className = "tile"; // Utilise le style de 104px défini dans CSS
    
    // Positionnement magique en grille (CSS Grid)
    // On ajoute +50 pour ne pas avoir de coordonnées négatives au début
    img.style.gridColumn = x + 50; 
    img.style.gridRow = y + 50;
    
    boardElement.appendChild(img);
    plateau.addTile(x, y, tile);
}

init();
