import { Tile } from './modules/Tile.js';

async function init() {
    try {
        // On charge le JSON de la tuile 04 qui est dans data/base/
        const response = await fetch('./data/base/04.json');
        const data = await response.json();

        // On crée la tuile avec les données
        const maTuile = new Tile(data);

        // On l'affiche
        const container = document.getElementById('tile-preview');
        const img = document.createElement('img');
        img.src = maTuile.imagePath; // Utilise le chemin assets/Base/C2/04.png
        img.id = "current-tile-img";
        container.appendChild(img);

        // On gère le bouton pour tourner
        document.getElementById('rotate-btn').addEventListener('click', () => {
            maTuile.rotation = (maTuile.rotation + 90) % 360;
            document.getElementById('current-tile-img').style.transform = `rotate(${maTuile.rotation}deg)`;
        });

    } catch (error) {
        console.error("Erreur de chargement :", error);
    }
}

init();