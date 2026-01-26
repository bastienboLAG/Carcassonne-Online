// modules/Tile.js
export class Tile {
    constructor(config) {
        this.id = config.id;
        // On construit le chemin vers l'image en fonction de ta nouvelle structure
        this.imagePath = `assets/Base/C2/${config.image}`;
        this.zones = config.zones;
        this.rotation = 0; 
    }

    getRotatedEdges(zone) {
        const transform = {
            'north': 'east', 'north-left': 'east-top', 'north-right': 'east-bottom',
            'east': 'south', 'east-top': 'south-right', 'east-bottom': 'south-left',
            'south': 'west', 'south-left': 'west-top', 'south-right': 'west-bottom',
            'west': 'north', 'west-top': 'north-right', 'west-bottom': 'north-left'
        };

        let currentEdges = [...zone.edges];
        let steps = (this.rotation / 90) % 4;

        for (let i = 0; i < steps; i++) {
            currentEdges = currentEdges.map(edge => transform[edge] || edge);
        }
        return currentEdges;
    }
}