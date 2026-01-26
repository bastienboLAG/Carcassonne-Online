import { Tile } from './modules/Tile.js';
import { Board } from './modules/Board.js';

const plateau = new Board();

async function init() {
    try {
        const response = await fetch('./data/Base/04.json');
        const data = await response.json();
        const maTuile = new Tile(data);

        // Preview
        const previewContainer = document.getElementById('tile-preview');
        const imgPreview = document.createElement('img');
        imgPreview.src = maTuile.imagePath;
        imgPreview.id = "current-tile-img";
        previewContainer.innerHTML = ''; 
        previewContainer.appendChild(imgPreview);

        // Pose sur le plateau (On utilise 50, 50 comme centre)
        poserTuileSurPlateau(maTuile, 50, 50);

        // FORCE LE SCROLL APRÈS UN COURT DÉLAI
        setTimeout(() => {
            const container = document.getElementById('board-container');
            if (container) {
                // Le milieu de 10400px est 5200. 
                // On retire la moitié de la largeur de la fenêtre pour être pile au centre.
                const centerX = 5200 - (container.clientWidth / 2);
                const centerY = 5200 - (container.clientHeight / 2);
                
                container.scrollLeft = centerX;
                container.scrollTop = centerY;
                console.log("Plateau centré en :", centerX, centerY);
            }
        }, 100); 

        // Rotation
        let totalRotation = 0;
        document.getElementById('rotate-btn').onclick = () => {
            totalRotation += 90;
            imgPreview.style.transform = `rotate(${totalRotation}deg)`;
            maTuile.rotation = totalRotation % 360;
        };

    } catch (error) {
        console.error("Erreur :", error);
    }
}

function poserTuileSurPlateau(tile, x, y) {
    const boardElement = document.getElementById('board');
    const img = document.createElement('img');
    img.src = tile.imagePath;
    img.className = "tile";
    img.style.gridColumn = x; 
    img.style.gridRow = y;
    boardElement.appendChild(img);
    plateau.addTile(x, y, tile);
}

init();
