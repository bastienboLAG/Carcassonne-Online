import { Tile } from './modules/Tile.js';

async function init() {
    console.log("Démarrage du jeu...");
    try {
        // 1. Chargement du JSON
        const response = await fetch('./data/base/04.json');
        if (!response.ok) throw new Error("Fichier JSON introuvable dans data/base/04.json");
        const data = await response.json();
        console.log("JSON chargé avec succès :", data);

        // 2. Création de la tuile
        const maTuile = new Tile(data);
        console.log("Chemin de l'image prévu :", maTuile.imagePath);

        // 3. Affichage
        const container = document.getElementById('tile-preview');
        const img = document.createElement('img');
        
        // On vérifie si l'image charge ou fait une erreur
        img.onload = () => console.log("L'image a chargé avec succès !");
        img.onerror = () => console.error("L'image n'a pas pu être trouvée à l'adresse : " + img.src);
        
        img.src = maTuile.imagePath; 
        img.id = "current-tile-img";
        container.innerHTML = ''; // On vide le texte "Chargement..."
        container.appendChild(img);

        // 4. Rotation
        document.getElementById('rotate-btn').onclick = () => {
            maTuile.rotation = (maTuile.rotation + 90) % 360;
            img.style.transform = `rotate(${maTuile.rotation}deg)`;
        };

    } catch (error) {
        console.error("Erreur détaillée :", error);
        document.getElementById('tile-preview').innerHTML = "<p style='color:red'>Erreur : " + error.message + "</p>";
    }
}

init();
