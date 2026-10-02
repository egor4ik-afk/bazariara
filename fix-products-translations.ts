
import 'dotenv/config'; // Load .env file
import { db } from './lib/db';
import { aiChat } from './lib/ai';

async function main() {
    console.log('Starting translation script...');

    const products = await db.products.findMany({
        include: {
            product_translations: true,
        },
    });

    console.log(`Found ${products.length} products to check for translations.`);

    const batchTranslate = async (texts: string[], targetLang: 'ru' | 'en'): Promise<string[]> => {
        if (texts.length === 0) return [];
        const nonEmptyTexts = texts.map(t => t || ' ');

        try {
            const response = await aiChat({
                system: `You are a professional translator. You will be given a list of texts in Georgian. Translate them to ${targetLang}. Return ONLY the translated texts, each on a new line. Do not include original texts or any other commentary. The number of lines in your output must exactly match the number of lines in the input.`,
                user: nonEmptyTexts.join('\n'),
            });
            return response.text.split('\n');
        } catch (error) {
            console.error(`Error during API call to translate to ${targetLang}:`, error);
            throw error; // Re-throw the error to be caught by the main loop
        }
    };

    for (const product of products) {
        const existingLangs = new Set(product.product_translations.map(t => t.lang));

        if (!existingLangs.has('ru') && product.name_ka) {
            console.log(`- Product ${product.id} (${product.name_ka}): Missing Russian translation. Translating...`);

            try {
                const textsToTranslate = [product.name_ka, product.description_ka || ''];
                const [translatedName, translatedDescription] = await batchTranslate(textsToTranslate, 'ru');

                if (translatedName) {
                    await db.product_translations.create({
                        data: {
                            product_id: product.id,
                            lang: 'ru',
                            name: translatedName,
                            description: translatedDescription,
                        },
                    });
                    console.log(`  - Created Russian translation for product ${product.id}.`);
                } else {
                    console.log(`  - WARNING: Failed to get Russian translation for product ${product.id}.`);
                }
            } catch (e) {
                console.error(`  - FAILED to process Russian translation for product ${product.id}.`);
            }
        }

        if (!existingLangs.has('en') && product.name_ka) {
            console.log(`- Product ${product.id} (${product.name_ka}): Missing English translation. Translating...`);
            
            try {
                const textsToTranslate = [product.name_ka, product.description_ka || ''];
                const [translatedName, translatedDescription] = await batchTranslate(textsToTranslate, 'en');

                if (translatedName) {
                    await db.product_translations.create({
                        data: {
                            product_id: product.id,
                            lang: 'en',
                            name: translatedName,
                            description: translatedDescription,
                        },
                    });
                    console.log(`  - Created English translation for product ${product.id}.`);
                } else {
                    console.log(`  - WARNING: Failed to get English translation for product ${product.id}.`);
                }
            } catch (e) {
                 console.error(`  - FAILED to process English translation for product ${product.id}.`);
            }
        }
    }

    console.log('Translation script finished.');
}

main().catch(error => {
    console.error('An error occurred during the translation process:', error);
    process.exit(1);
});
