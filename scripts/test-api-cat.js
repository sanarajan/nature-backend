const axios = require('axios');

async function test() {
    const res = await axios.get('http://localhost:5000/api/user/products/6a0e04693319ec1ef4d6edfd');
    console.log("category:", JSON.stringify(res.data.data.categoryId, null, 2));
    process.exit(0);
}

test().catch(console.error);
