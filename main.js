import { Tile } from './modules/Tile.js';
import { Board } from './modules/Board.js';

const plateau = new Board();

async function init() {
    console.log("Tentative d'initialisation...");
    try {
        const response = await fetch('./data/Base/04.json');
        const data = await response.json();
        const maTuile = new Tile(data);

        // Test 1 : Est-ce que l'interface de preview reçoit bien l'image ?
        const preview = document.getElementById('tile-preview');
        preview.innerHTML = `<img src="${maTuile.imagePath}" id="current-tile-img" style="width:80px">`;
        console.log("Preview mise à jour");

        // Test 2 : On force l'apparition de la tuile sur le plateau
        const boardElement = document.getElementById('board');
        if (!boardElement) {
            console.error("ERREUR : L'élément #board est introuvable dans le HTML !");
            return;
        }

        const img = document.createElement('img');
        img.src = maTuile.imagePath;
        img.style.gridColumn = 50;
        img.style.gridRow = 50;
        img.style.width = "104px";
        img.style.height = "104px";
        img.style.border = "2px solid red"; // Bordure rouge pour la voir !
        
        boardElement.appendChild(img);
        console.log("Tuile ajoutée au plateau à la position visuelle 50,50");

    } catch (e) {
        console.error("Erreur dans init :", e);
    }
}

init();
