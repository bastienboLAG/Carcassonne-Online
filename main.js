import { Tile } from './modules/Tile.js';

async function init() {
    try {
        // ATTENTION : "Base" avec une majuscule pour correspondre à ton dossier
        const response = await fetch('./data/Base/04.json'); 
        
        if (!response.ok) throw new Error(`Le fichier JSON est introuvable (Erreur ${response.status})`);
        
        const data = await response.json();

        // On crée la tuile
        const maTuile = new Tile(data);

        // Affichage
        const container = document.getElementById('tile-preview');
        const img = document.createElement('img');
        
        // On s'assure que le chemin vers l'image utilise aussi "Base"
        img.src = maTuile.imagePath; 
        img.id = "current-tile-img";
        img.style.width = "104px";
        
        container.innerHTML = ''; 
        container.appendChild(img);

        // Rotation
        document.getElementById('rotate-btn').onclick = () => {
            maTuile.rotation = (maTuile.rotation + 90) % 360;
            img.style.transform = `rotate(${maTuile.rotation}deg)`;
        };

    } catch (error) {
        console.error("Erreur détaillée :", error);
        document.getElementById('tile-preview').innerHTML = `<p style='color:orange'>Problème : ${error.message}</p>`;
    }
}

init();
