import { Multiplayer } from './modules/Multiplayer.js';

const multiplayer = new Multiplayer();
let gameCode = null;

// Gestion du choix de couleur
const colorOptions = document.querySelectorAll('.color-option');
colorOptions.forEach(option => {
    option.addEventListener('click', () => {
        colorOptions.forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');
        option.querySelector('input').checked = true;
    });
});

// Gestion des toggles
const toggles = document.querySelectorAll('input[type="checkbox"]');
toggles.forEach(toggle => {
    toggle.addEventListener('change', () => {
        console.log(`${toggle.id} : ${toggle.checked}`);
    });
});

// Gestion des radios
const radios = document.querySelectorAll('input[type="radio"]');
radios.forEach(radio => {
    radio.addEventListener('change', () => {
        console.log(`${radio.name} : ${radio.value}`);
    });
});

// ✅ NOUVEAU : Créer une partie multijoueur
document.getElementById('create-game-btn')?.addEventListener('click', async () => {
    try {
        gameCode = await multiplayer.createGame();
        alert(`Partie créée !\nCode: ${gameCode}\n\nPartagez ce code avec vos amis !`);
        
        // Afficher le code dans l'interface
        document.getElementById('game-code-display').textContent = `Code: ${gameCode}`;
        
        // Callbacks
        multiplayer.onPlayerJoined = (playerId) => {
            console.log('Nouveau joueur:', playerId);
            // TODO: Ajouter le joueur à la liste visuelle
        };
        
        multiplayer.onDataReceived = (data, from) => {
            console.log('Reçu de', from, ':', data);
            // TODO: Gérer les actions reçues
        };
        
    } catch (error) {
        alert('Erreur lors de la création de la partie: ' + error);
    }
});

// ✅ NOUVEAU : Rejoindre une partie
document.getElementById('join-game-btn')?.addEventListener('click', async () => {
    const code = prompt('Entrez le code de la partie:');
    if (!code) return;
    
    try {
        await multiplayer.joinGame(code);
        alert('Connecté à la partie !');
        
        multiplayer.onDataReceived = (data, from) => {
            console.log('Reçu de l\'hôte:', data);
            // TODO: Gérer les mises à jour du jeu
        };
        
    } catch (error) {
        alert('Erreur de connexion: ' + error);
    }
});

console.log('Page d\'accueil chargée');
