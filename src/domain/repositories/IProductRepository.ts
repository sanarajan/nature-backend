export interface IProductRepository {
    findById(id: string): Promise<any>;
    findProductsByIds(ids: string[]): Promise<any[]>;
    findProduct(query: any): Promise<any>;
    findProducts(query: any, limit?: number, sort?: any, populate?: any): Promise<any[]>;
    findProductBySkuPattern(prefix: string): Promise<any>;
    createProduct(data: any): Promise<any>;
    updateProduct(id: string, data: any): Promise<any>;
    deleteProduct(id: string): Promise<any>;
    countByCategoryId(categoryId: string): Promise<number>;
    countBySubcategoryId(subcategoryId: string): Promise<number>;
    getProductCountsByCategory(): Promise<Array<{ _id: string, count: number }>>;
}
