/**
 * Validator.js
 */

const rotationMap = {
    "north": "east", "east": "south", "south": "west", "west": "north",
    "north-left": "east-top", "east-top": "south-right", "south-right": "west-bottom", "west-bottom": "north-left",
    "north-right": "east-bottom", "east-bottom": "south-left", "south-left": "west-top", "west-top": "north-right"
};

const opposites = {
    "north": "south", "south": "north", "east": "west", "west": "east",
    "north-left": "south-left", "south-left": "north-left",
    "north-right": "south-right", "south-right": "north-right",
    "east-top": "west-top", "west-top": "east-top",
    "east-bottom": "west-bottom", "west-bottom": "east-bottom"
};

function getPhysicalKey(originalKey, rotation) {
    let key = originalKey;
    let steps = (rotation / 90) % 4;
    for (let i = 0; i < steps; i++) {
        key = rotationMap[key];
    }
    return key;
}

export function areEdgesCompatible(tileA, rotA, tileB, rotB, sideA) {
    const sideB = opposites[sideA];
    
    // On extrait tous les segments de la tuile A qui finissent sur le côté physique sideA
    const segmentsA = Object.keys(tileA.edges).filter(key => {
        const phys = getPhysicalKey(key, rotA);
        return phys === sideA || phys.startsWith(sideA + '-');
    });

    for (const keyA of segmentsA) {
        const physA = getPhysicalKey(keyA, rotA);
        const physB = opposites[physA]; // Le segment exact qu'on cherche chez le voisin

        // Trouver quelle clé JSON de tileB atterrit sur physB
        const keyB = Object.keys(tileB.edges).find(k => getPhysicalKey(k, rotB) === physB);

        if (keyB) {
            const typeA = tileA.zones[tileA.edges[keyA]].type;
            const typeB = tileB.zones[tileB.edges[keyB]].type;
            if (typeA !== typeB) return false;
        }
    }
    return true;
}
