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

    getTileAt(x, y) {
        return this.placedTiles[`${x},${y}`] || null;
    }

    canPlaceTile(x, y, newTile) {
        // Définition des voisins et des segments correspondants face à face
        const neighbors = [
            { 
                nx: x, ny: y - 1, 
                segments: ['north', 'north-left', 'north-right'], 
                opposite: ['south', 'south-left', 'south-right'] 
            },
            { 
                nx: x + 1, ny: y, 
                segments: ['east', 'east-top', 'east-bottom'], 
                opposite: ['west', 'west-top', 'west-bottom'] 
            },
            { 
                nx: x, ny: y + 1, 
                segments: ['south', 'south-left', 'south-right'], 
                opposite: ['north', 'north-left', 'north-right'] 
            },
            { 
                nx: x - 1, ny: y, 
                segments: ['west', 'west-top', 'west-bottom'], 
                opposite: ['east', 'east-top', 'east-bottom'] 
            }
        ];

        const newZones = newTile.currentZones;
        let hasNeighbor = false;

        for (const { nx, ny, segments, opposite } of neighbors) {
            const neighborTile = this.getTileAt(nx, ny);
            
            if (neighborTile) {
                hasNeighbor = true;
                const neighborZones = neighborTile.currentZones;
                
                // Vérification de chaque segment du bord
                for (let i = 0; i < segments.length; i++) {
                    if (newZones[segments[i]] !== neighborZones[opposite[i]]) {
                        return false; // Conflit de terrain détecté
                    }
                }
            }
        }

        // Pour Carcassonne, une tuile doit être adjacente à au moins une autre (sauf la première)
        return hasNeighbor;
    }
}
