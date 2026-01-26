import { Tile } from './modules/Tile.js';
import { Board } from './modules/Board.js';

const plateau = new Board();

async function init() {
    try {
        // 1. Chargement de la tuile de départ (04.json)
        const response = await fetch('./data/Base/04.json');
        if (!response.ok) throw new Error("Impossible de charger le JSON");
        const data = await response.json();
        const maTuile = new Tile(data);

        // 2. Affichage dans la "main" du joueur (Preview en haut)
        const previewContainer = document.getElementById('tile-preview');
        const imgPreview = document.createElement('img');
        imgPreview.src = maTuile.imagePath;
        imgPreview.id = "current-tile-img";
        previewContainer.innerHTML = ''; 
        previewContainer.appendChild(imgPreview);

        // 3. Pose de la tuile de départ au centre (50, 50)
        poserTuileSurPlateau(maTuile, 50, 50);

        // 4. Centrer la vue du joueur sur le milieu du plateau
        const container = document.getElementById('board-container');
        // 5200px est le milieu exact (100 cases * 104px / 2)
        container.scrollLeft = 5200 - (container.clientWidth / 2);
        container.scrollTop = 5200 - (container.clientHeight / 2);

        // 5. Gestion de la rotation (visuelle + logique)
        let totalRotation = 0;
        document.getElementById('rotate-btn').onclick = () => {
            totalRotation += 90;
            imgPreview.style.transform = `rotate(${totalRotation}deg)`;
            maTuile.rotation = totalRotation % 360;
        };

    } catch (error) {
        console.error("Erreur d'initialisation :", error);
    }
}

/**
 * Fonction pour ajouter visuellement et logiquement une tuile sur la grille
 */
function poserTuileSurPlateau(tile, x, y) {
    const boardElement = document.getElementById('board');
    const img = document.createElement('img');
    
    img.src = tile.imagePath;
    img.className = "tile";
    
    // Positionnement dans la grille CSS
    img.style.gridColumn = x; 
    img.style.gridRow = y;
    
    boardElement.appendChild(img);
    
    // On l'enregistre dans notre objet Board
    plateau.addTile(x, y, tile);
}

// Lancement du jeu
init();
