import { Multiplayer } from './modules/Multiplayer.js';

const multiplayer = new Multiplayer();
let gameCode = null;
let playerName = '';
let playerColor = 'blue';
let players = [];
let takenColors = [];
let inLobby = false;
let isHost = false;

const colorImages = {
    'black': './assets/Meeples/Black/Normal.png',
    'red': './assets/Meeples/Red/Normal.png',
    'pink': './assets/Meeples/Pink/Normal.png',
    'green': './assets/Meeples/Green/Normal.png',
    'blue': './assets/Meeples/Blue/Normal.png',
    'yellow': './assets/Meeples/Yellow/Normal.png'
};

const allColors = ['black', 'red', 'pink', 'green', 'blue', 'yellow'];

// Gestion du pseudo
document.getElementById('pseudo-input').addEventListener('input', (e) => {
    playerName = e.target.value.trim();
});

function getAvailableColor() {
    for (const color of allColors) {
        if (!takenColors.includes(color)) {
            return color;
        }
    }
    return 'blue';
}

function updateAvailableColors() {
    const colorOptions = document.querySelectorAll('.color-option');
    
    colorOptions.forEach(option => {
        const color = option.dataset.color;
        const input = option.querySelector('input');
        
        if (takenColors.includes(color) && color !== playerColor) {
            option.classList.add('disabled');
            input.disabled = true;
        } else {
            option.classList.remove('disabled');
            input.disabled = false;
        }
    });
}

// ✅ CORRECTION : Fonction pour afficher/masquer le sélecteur de couleur
function updateColorPickerVisibility() {
    const colorPicker = document.querySelector('.color-picker');
    
    if (inLobby) {
        colorPicker.style.display = 'block';
    } else {
        colorPicker.style.display = 'none';
    }
}

// ✅ CORRECTION : Désactiver UNIQUEMENT les options de configuration (pas tout)
function updateOptionsAccess() {
    const configInputs = document.querySelectorAll('.home-right input');
    const configLabels = document.querySelectorAll('.home-right label');
    const startButton = document.querySelector('.start-button');
    
    if (inLobby && !isHost) {
        // Désactiver les options pour les invités
        configInputs.forEach(input => {
            input.disabled = true;
        });
        configLabels.forEach(label => {
            label.style.opacity = '0.5';
            label.style.pointerEvents = 'none';
        });
        
        if (startButton) {
            startButton.style.pointerEvents = 'none';
            startButton.style.opacity = '0.5';
            startButton.textContent = 'En attente de l\'hôte...';
        }
    } else if (inLobby && isHost) {
        // Réactiver pour l'hôte
        configInputs.forEach(input => {
            input.disabled = false;
        });
        configLabels.forEach(label => {
            label.style.opacity = '1';
            label.style.pointerEvents = 'auto';
        });
        
        if (startButton) {
            startButton.style.pointerEvents = 'auto';
            startButton.style.opacity = '1';
            startButton.textContent = 'Démarrer la partie';
        }
    }
}

function update
