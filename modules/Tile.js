export class Tile {
    constructor(data) {
        this.id = data.id;
        this.imagePath = `/assets/Base/C2/${data.id}.png`;
        this.zones = data.zones; // Contient tes données : { "north-left": "city", ... }
        this.rotation = 0; // Sera 0, 90, 180 ou 270
    }

    /**
     * Renvoie les zones de la tuile après application de la rotation actuelle
     */
    get currentZones() {
        let rotatedZones = { ...this.zones };
        const steps = (this.rotation / 90) % 4;

        // On applique le mapping autant de fois que nécessaire
        const transform = {
            'north': 'east', 'north-left': 'east-top', 'north-right': 'east-bottom',
            'east': 'south', 'east-top': 'south-right', 'east-bottom': 'south-left',
            'south': 'west', 'south-left': 'west-top', 'south-right': 'west-bottom',
            'west': 'north', 'west-top': 'north-right', 'west-bottom': 'north-left'
        };

        for (let i = 0; i < steps; i++) {
            let nextState = {};
            for (let [zone, type] of Object.entries(rotatedZones)) {
                const newZoneName = transform[zone] || zone; // On transforme si le nom existe dans le map
                nextState[newZoneName] = type;
            }
            rotatedZones = nextState;
        }

        return rotatedZones;
    }
}



