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
	let currentRotation = 0; // 0, 90, 180, 270
	document.getElementById('rotate-btn').onclick = () => {
   	currentRotation += 90;
 	// On applique la rotation visuelle sans se soucier du retour à zéro
    	img.style.transform = `rotate(${currentRotation}deg)`;
    
    	// Pour la logique interne du jeu (tes JSON), on garde une valeur entre 0 et 270
   	 maTuile.rotation = currentRotation % 360;
	};

    } catch (error) {
        console.error("Erreur détaillée :", error);
        document.getElementById('tile-preview').innerHTML = `<p style='color:orange'>Problème : ${error.message}</p>`;
    }
}

init();