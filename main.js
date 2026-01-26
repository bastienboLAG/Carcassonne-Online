// main.js
import { Tile } from './modules/Tile.js';

async function testGame() {
    try {
        // 1. On va chercher le JSON dans data/base
        const response = await fetch('./data/base/04.json');
        const data = await response.json();

        // 2. On crée une tuile avec ces données
        const maTuile = new Tile(data);

        // 3. On l'affiche dans le HTML
        const container = document.getElementById('tile-preview');
        const img = document.createElement('img');
        img.src = maTuile.imagePath;
        img.id = "current-tile-img";
        container.appendChild(img);

        // 4. On gère le bouton de rotation
        const btn = document.getElementById('rotate-btn');
        btn.addEventListener('click', () => {
            maTuile.rotation = (maTuile.rotation + 90) % 360;
            document.getElementById('current-tile-img').style.transform = `rotate(${maTuile.rotation}deg)`;
            console.log("Nouvelle rotation :", maTuile.rotation);
        });

    } catch (error) {
        console.error("Erreur lors du chargement :", error);
    }
}

testGame();