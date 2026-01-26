export class Board {
    constructor() {
        this.placedTiles = {}; 
    }

    addTile(x, y, tile) {
        this.placedTiles[`${x},${y}`] = tile;
    }

    isFree(x, y) {
        return this.placedTiles[`${x},${y}`] === undefined;
    }

    // Récupérer la tuile à une position donnée (ou null si vide)
    getTileAt(x, y) {
        return this.placedTiles[`${x},${y}`] || null;
    }

    /**
     * Vérifie si une tuile peut être posée à ces coordonnées
     * en comparant ses bords avec les voisins existants.
     */
    canPlaceTile(x, y, newTile) {
        const neighbors = [
            { nx: x, ny: y - 1, side: 'top', opposite: 'bottom' },    // Nord
            { nx: x + 1, ny: y, side: 'right', opposite: 'left' },   // Est
            { nx: x, ny: y + 1, side: 'bottom', opposite: 'top' },   // Sud
            { nx: x - 1, ny: y, side: 'left', opposite: 'right' }    // Ouest
        ];

        const newZones = newTile.currentZones;

        for (const { nx, ny, side, opposite } of neighbors) {
            const neighborTile = this.getTileAt(nx, ny);
            
            if (neighborTile) {
                const neighborZones = neighborTile.currentZones;
                
                // Comparaison simple du type de terrain sur le bord commun
                // On vérifie si la zone 'north' de l'une match le 'south' de l'autre, etc.
                if (newZones[side] !== neighborZones[opposite]) {
                    console.log(`Invalide : Le bord ${side} ne correspond pas au voisin.`);
                    return false;
                }
            }
        }
        return true; // Aucun conflit trouvé !
    }
}
