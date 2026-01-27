function poserTuile(x, y, tile, isFirst = false) {
    // Si ce n'est pas la première, on vérifie les règles du Board
    if (!isFirst && !plateau.canPlaceTile(x, y, tile)) return;

    const boardElement = document.getElementById('board');
    const img = document.createElement('img');
    img.src = tile.imagePath;
    img.className = "tile";
    img.style.gridColumn = x; 
    img.style.gridRow = y;
    img.style.transform = `rotate(${tile.rotation}deg)`;
    boardElement.appendChild(img);
    
    // Sauvegarde logique
    const copy = tile.clone();
    plateau.addTile(x, y, copy);

    if (!isFirst) {
        tuilePosee = true;
        
        // Supprimer tous les slots immédiatement après placement
        document.querySelectorAll('.slot').forEach(s => s.remove());
        
        // ✅ NOUVEAU : Afficher le verso de la tuile
        document.getElementById('tile-preview').innerHTML = '<img src="./assets/Base/C2/verso.png" style="width: 120px; border: 2px solid #666;">';
        
        // Vider la tuile en main pour empêcher un nouveau placement
        tuileEnMain = null;
    } else {
        rafraichirTousLesSlots();
    }
}
