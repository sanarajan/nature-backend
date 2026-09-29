const axios = require('axios');

async function testApi() {
    try {
        const payload = {
            productName: "TEST PRODUCT API",
            categoryId: "699f384ec5190b89e3eca22b",
            unitId: "699f42f0c93650e569fc32aa",
            quantity: 50,
            stock: 100,
            price: 1,
            labelControl: "TEST LABEL CONTROL DATA",
            specialPublishingClaimsNote: "TEST SPECIAL PUBLISHING NOTE"
        };
        const res = await axios.post('http://localhost:5000/api/admin/products', payload);
        console.log("Response:", res.data);
    } catch(err) {
        console.log("Error:", err.response ? err.response.data : err.message);
    }
}
testApi();
