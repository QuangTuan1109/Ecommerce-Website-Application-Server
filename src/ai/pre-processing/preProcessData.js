import levenshtein from 'fast-levenshtein';

export function preprocessData(searchHistory, orders, products) {
    const inputFeatures = [];
    const outputData = [];

    products.forEach((product, index) => {
        let similaritySum = 0;
        const productName = product.Name.toLowerCase();
        
        searchHistory.keywords.forEach(keyword => {
            const keywordSimilarity = levenshtein.get(productName, keyword.toLowerCase());
            similaritySum += keywordSimilarity;
        });

        orders.forEach(order => {
            const orderSimilarity = levenshtein.get(productName, order.toLowerCase());
            similaritySum += orderSimilarity;
        });

        const normalizedSimilarity = similaritySum / (searchHistory.keywords.length + orders.length);
        
        inputFeatures.push([normalizedSimilarity]);
        outputData.push(index);
    });

    return { input: inputFeatures, output: outputData };
}
