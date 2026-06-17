const fs = require('fs');
const path = require('path');
const { globSync } = require('glob');
const sharp = require('sharp');

const ASSETS_DIR = path.join(__dirname, '..', 'assets', 'images');

// Vind alle JPG, JPEG, en PNG bestanden in de assets/images map
const files = globSync('**/*.{jpg,jpeg,png}', { cwd: ASSETS_DIR, absolute: true });

async function processImages() {
    console.log(`Gevonden: ${files.length} afbeeldingen om te optimaliseren.`);
    
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    let bytesSaved = 0;

    for (const file of files) {
        try {
            const parsed = path.parse(file);
            const webpPath = path.join(parsed.dir, `${parsed.name}.webp`);

            // Sla over als de WebP versie al bestaat
            if (fs.existsSync(webpPath)) {
                console.log(`[SKIPPED] ${parsed.name}.webp bestaat al.`);
                skipCount++;
                continue;
            }

            console.log(`[PROCESSING] ${path.relative(ASSETS_DIR, file)} -> .webp...`);
            
            // Oorspronkelijke grootte
            const originalStats = fs.statSync(file);
            const originalSize = originalStats.size;

            // Omzetten naar WebP met Sharp
            // Quality 80 is de perfecte balans tussen kwaliteit en bestandsgrootte voor web
            await sharp(file)
                .webp({ quality: 80 })
                .toFile(webpPath);
            
            const newStats = fs.statSync(webpPath);
            const newSize = newStats.size;
            
            bytesSaved += (originalSize - newSize);
            successCount++;
            
            const savedPct = Math.round(((originalSize - newSize) / originalSize) * 100);
            console.log(`  -> Klaar. Bespaard: ${savedPct}% (${Math.round((originalSize - newSize) / 1024)} KB)`);

        } catch (error) {
            console.error(`[ERROR] Fout bij verwerken van ${file}:`, error.message);
            errorCount++;
        }
    }

    console.log('\n=============================================');
    console.log(`Optimalisatie voltooid!`);
    console.log(`Succesvol omgezet: ${successCount}`);
    console.log(`Overgeslagen (bestond al): ${skipCount}`);
    console.log(`Fouten: ${errorCount}`);
    if (bytesSaved > 0) {
        console.log(`Totale opslag bespaard: ${(bytesSaved / 1024 / 1024).toFixed(2)} MB`);
    }
    console.log('=============================================');
    console.log('\nLET OP: Je kunt nu in je HTML/CSS bestanden .jpg/.png vervangen door .webp voor snellere laadtijden.');
}

processImages();
