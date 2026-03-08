"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseRepository = void 0;
class BaseRepository {
    model;
    constructor(model) {
        this.model = model;
    }
    async findAll(filter = {}) {
        const docs = await this.model.find(filter);
        return docs.map((doc) => this.mapToEntity(doc));
    }
    async findById(id) {
        const doc = await this.model.findById(id);
        return doc ? this.mapToEntity(doc) : null;
    }
    async findOne(filter) {
        const doc = await this.model.findOne(filter);
        return doc ? this.mapToEntity(doc) : null;
    }
    async save(entity) {
        const data = this.mapToDocument(entity);
        const doc = await this.model.findOneAndUpdate({ _id: entity.id || new Object() }, // Simplified for generic
        data, { upsert: true, new: true });
        return this.mapToEntity(doc);
    }
    async delete(id) {
        await this.model.findByIdAndDelete(id);
    }
}
exports.BaseRepository = BaseRepository;
