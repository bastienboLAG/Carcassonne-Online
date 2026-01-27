export class Tile {
    constructor(data) {
        this.id = data.id;
        this.imagePath = `./assets/Base/C2/${this.id}.png`; 
        this.zones = data.zones || [];
        this.rotation = 0;
    }

    /**
     * Traduit une position d'edge selon la rotation actuelle
     * @param {string} edgeName - Ex: "north-left", "east", "south-right"
     * @returns {string} - L'edge après rotation
     */
    _rotateEdgeName(edgeName) {
        // Rotation de 90° horaire
        const rotationMap = {
            'north-left': 'east-top',
            'north': 'east',
            'north-right': 'east-bottom',
            
            'east-top': 'south-right',
            'east': 'south',
            'east-bottom': 'south-left',
            
            'south-right': 'west-bottom',
            'south': 'west',
            'south-left': 'west-top',
            
            'west-bottom': 'north-left',
            'west': 'north',
            'west-top': 'north-right'
        };

        let currentEdge = edgeName;
        const steps = (this.rotation / 90) % 4;

        for (let i = 0; i < steps; i++) {
            currentEdge = rotationMap[currentEdge] || currentEdge;
        }

        return currentEdge;
    }

    /**
     * Retourne le type de zone à une position donnée (en tenant compte de la rotation)
     * @param {string} edgeName - Ex: "north-left", "east", "south-right"
     * @returns {string|null} - Le type de zone ("city", "road", "field", "abbey") ou null
     */
    getEdgeType(edgeName) {
        // Traduire l'edge selon la rotation actuelle
        const rotatedEdge = this._rotateEdgeName(edgeName);

        // Chercher d'abord l'edge spécifique (ex: "north-left")
        for (const zone of this.zones) {
            if (zone.edges.includes(rotatedEdge)) {
                return zone.type;
            }
        }

        // Si pas trouvé, chercher l'edge générique (ex: "north" pour "north-left")
        const genericEdge = rotatedEdge.split('-')[0]; // "north-left" → "north"
        if (genericEdge !== rotatedEdge) {
            for (const zone of this.zones) {
                if (zone.edges.includes(genericEdge)) {
                    return zone.type;
                }
            }
        }

        // Pas trouvé (normalement impossible si JSON correct)
        return null;
    }

    /**
     * ✅ NOUVEAU : Crée une copie profonde de la tuile
     * @returns {Tile} Une nouvelle instance de Tile avec les mêmes données
     */
    clone() {
        const clonedTile = new Tile({
            id: this.id,
            zones: this.zones  // Les zones sont déjà des objets, pas besoin de deep copy
        });
        clonedTile.rotation = this.rotation;
        return clonedTile;
    }
}
