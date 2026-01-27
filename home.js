// home.js - Gestion de la page d'accueil

// Gestion du choix de couleur
const colorOptions = document.querySelectorAll('.color-option');
colorOptions.forEach(option => {
    option.addEventListener('click', () => {
        colorOptions.forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');
        option.querySelector('input').checked = true;
    });
});

// Gestion des toggles (plus tard : synchronisation)
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

// Plus tard : ici on ajoutera la logique PeerJS
console.log('Page d\'accueil chargée');