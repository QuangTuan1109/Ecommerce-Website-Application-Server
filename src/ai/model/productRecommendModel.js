import KNN from 'ml-knn';

export async function trainModel(inputData, outputData) {
    const formattedInputData = inputData.map(item => [item[0]]);
    const formattedOutputData = outputData;

    const knn = new KNN(formattedInputData, formattedOutputData, { k: 3 });
    return knn;
}

export function recommendProducts(knn, userInput) {
    const formattedUserInput = userInput.map(item => [item[0]]);
    const recommendedProductsIndex = knn.predict(formattedUserInput);
    return recommendedProductsIndex;
}
