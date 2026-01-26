export class Tile {
    constructor(data) {
        this.id = data.id;
        // On remet en minuscule comme chez toi
        this.imagePath = `./assets/Base/C2/${this.id}.png`; 
        this.zones = data.zones;
        this.rotation = 0;
    }

    get currentZones() {
        let rotatedZones = { ...this.zones };
        const steps = (this.rotation / 90) % 4;

        const transform = {
            'north': 'east', 'north-left': 'east-top', 'north-right': 'east-bottom',
            'east': 'south', 'east-top': 'south-right', 'east-bottom': 'south-left',
            'south': 'west', 'south-left': 'west-top', 'south-right': 'west-bottom',
            'west': 'north', 'west-top': 'north-right', 'west-bottom': 'north-left'
        };

        for (let i = 0; i < steps; i++) {
            let nextState = {};
            for (let [zone, type] of Object.entries(rotatedZones)) {
                // On transforme la clé seulement si elle est dans la liste, sinon on garde l'original (ex: center)
                const newZoneName = transform[zone] || zone;
                nextState[newZoneName] = type;
            }
            rotatedZones = nextState;
        }
        return rotatedZones;
    }
}
